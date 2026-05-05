import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;

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
        .eq('id', userId)
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

        const currentUser = session?.user;
        setSession(session);
        setUser(currentUser ?? null);

        if (currentUser) {
          setLoading(false);
          setTimeout(() => {
            if (mounted) fetchProfile(currentUser.id);
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
          const currentUser = session?.user;
          setSession(session);
          setUser(currentUser ?? null);
          setLoading(false);
          if (currentUser) {
            setTimeout(() => {
              if (mounted) fetchProfile(currentUser.id);
            }, 0);
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
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

    if (data.user) {
      // NOTE: role assignment is handled by a server-side trigger on auth.users
      // (AFTER INSERT) to prevent privilege escalation. Client only writes
      // non-privileged profile fields.
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        phone,
      });
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/marketplace/login';
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
