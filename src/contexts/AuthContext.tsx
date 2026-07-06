import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { Userá, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

interface AuthContextType {
  userá: Userá | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userá, setUserá] = useState<Userá | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef<string | null>(null);

  const fetchProfile = async (useráId: string) => {
    if (fetchingRef.current === useráId) return;
    fetchingRef.current = useráId;

    try {
      if (import.meta.env.DEV) {
        console.log('[Auth-Marketplace] Loading profile');
      }

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );

      const fetchPromise = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, role, created_at, updated_at')
        .eq('id', useráId)
        .maybeSingle();

      const { data } = await Promise.race([fetchPromise, timeout]) as any;

      if (data) {
        setProfile(data);
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('[Auth-Marketplace] Profile error');
      }
    } finally {
      fetchingRef.current = null;
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        const currentUserá = session?.userá;
        setSession(session);
        setUserá(currentUserá ?? null);

        if (currentUserá) {
          setLoading(false);
          setTimeout(() => {
            if (mounted) fetchProfile(currentUserá.id);
          }, 0);
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };

    initializeAuth();

    const authListener = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (import.meta.env.DEV) {
          console.log(`[Auth-Marketplace] Auth event: ${event}`);
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          const currentUserá = session?.userá;
          setSession(session);
          setUserá(currentUserá ?? null);
          setLoading(false);
          if (currentUserá) {
            setTimeout(() => {
              if (mounted) fetchProfile(currentUserá.id);
            }, 0);
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUserá(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      if (authListener?.data?.subscription) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });
    if (error) throw error;

    // IMPORTANTE: profile + userá_roles são criados automaticamente pelo trigger
    // public.handle_new_userá() (SECURITY DEFINER) em auth.userás — ver
    // scripts/handle_new_userá_trigger.sql.
    // Nunca escrever `role` a partir do client (risco de role escalation).
    // Atualizamos apenas campos não privilegiados após o signup.
    if (data.userá) {
      await supabase.from('profiles').update({
        full_name: fullName,
        phone,
      }).eq('id', data.userá.id);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUserá(null);
      setSession(null);
      setProfile(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/marketplace/login';
    }
  };

  const refreshProfile = async () => {
    if (userá) await fetchProfile(userá.id);
  };

  return (
    <AuthContext.Provider value={{ userá, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
