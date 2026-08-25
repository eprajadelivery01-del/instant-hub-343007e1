import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

const GUEST_EMAIL = 'guest_client_marketplace@epraja.com';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isGuest: boolean;
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
  const [isGuest, setIsGuest] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;

    try {
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
        let currentSession: Session | null = null;
        try {
          const res = await supabase.auth.getSession();
          if (res.error) {
            if (res.error.message?.includes("Refresh Token") || res.error.message?.includes("Invalid")) {
              try {
                localStorage.removeItem("epraja-marketplace-auth-token");
                await supabase.auth.signOut({ scope: "local" });
              } catch {}
            }
          } else {
            currentSession = res.data.session;
          }
        } catch (e: any) {
          try {
            localStorage.removeItem("epraja-marketplace-auth-token");
            await supabase.auth.signOut({ scope: "local" });
          } catch {}
        }

        if (!mounted) return;

        const currentUser = currentSession?.user;
        const guestUser = currentUser?.email === GUEST_EMAIL;

        setSession(currentSession);
        if (currentUser && !guestUser) {
          setUser(currentUser);
          setIsGuest(false);
          setLoading(false);
          setTimeout(() => {
            if (mounted) fetchProfile(currentUser.id);
          }, 0);
        } else {
          setUser(null);
          setIsGuest(true);
          setProfile(null);
          
          if (!currentSession) {
            // Autenticação em segundo plano para o leitor público de dados Supabase (evita RLS 42501)
            try {
              const { data: guestRes } = await supabase.auth.signInWithPassword({
                email: GUEST_EMAIL,
                password: 'GuestClient123!'
              });
              if (guestRes?.session && mounted) {
                setSession(guestRes.session);
              }
            } catch (e) {
              console.warn('[Auth-Marketplace] Guest auth fallback warning:', e);
            }
          }
          if (mounted) setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const authListener = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        const currentUser = session?.user;
        const guestUser = currentUser?.email === GUEST_EMAIL;

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && currentUser && !guestUser) {
          setSession(session);
          setUser(currentUser);
          setIsGuest(false);
          setLoading(false);
          setTimeout(() => {
            if (mounted) fetchProfile(currentUser.id);
          }, 0);
        } else if (guestUser || !currentUser || event === 'SIGNED_OUT') {
          setSession(session ?? null);
          setUser(null);
          setIsGuest(true);
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
      await supabase.from('profiles').update({
        full_name: fullName,
        phone,
      }).eq('id', data.user.id);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsGuest(true);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/marketplace';
    }
  };

  const refreshProfile = async () => {
    if (user && !isGuest) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isGuest, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
