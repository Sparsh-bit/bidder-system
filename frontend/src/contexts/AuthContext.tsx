// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';

interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) console.warn('Profile load error:', error);
    if (data) setProfile(data as Profile);
    else setProfile(null);
  }

  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      console.log('Auth: Initializing...');
      try {
        // Check if sessionStorage is available
        if (typeof sessionStorage === 'undefined') {
          console.warn('Auth: sessionStorage is not defined');
        }

        // Get existing session (safe fallback)
        console.log('Auth: Getting session...');
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn('Session fetch error:', error);

        console.log('Auth: Session data received', data);

        const session = (data as any)?.session ?? null;
        if (!active) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('Auth: Loading profile for user', session.user.id);
          await loadProfile(session.user.id);
        } else {
          console.log('Auth: No user session found');
          setProfile(null);
        }

        // Watch for auth state changes
        const { data: listener } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('Auth: State change event', event);
            if (!active) return;
            setSession(newSession);
            setUser(newSession?.user ?? null);
            if (newSession?.user) await loadProfile(newSession.user.id);
            else setProfile(null);
          }
        );

        return () => {
          active = false;
          listener?.subscription?.unsubscribe();
        };
      } catch (err) {
        console.error('Auth initialization failed:', err);
        if (active) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        console.log('Auth: Initialization complete, setting loading=false');
        // Ensure loading always ends
        if (active) setLoading(false);
      }
    }

    initializeAuth();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (!error && (data as any)?.user) await loadProfile((data as any).user.id);
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
    // also clearing local storage reduces stale state issues:
    try { sessionStorage.clear(); } catch (e) { }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (!error) await loadProfile(user.id);
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, signUp, signIn, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
