import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    refreshWallet: () => Promise<void>;
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

    // Fetch wallet balance separately if needed, or just reload profile
    const refreshWallet = async () => {
        if (user) await loadProfile(user.id);
    };

    useEffect(() => {
        let active = true;

        async function initializeAuth() {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!active) return;

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await loadProfile(session.user.id);
                }
            } catch (err) {
                console.error('Auth initialization failed:', err);
            } finally {
                if (active) setLoading(false);
            }

            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                async (_event, newSession) => {
                    if (!active) return;
                    setSession(newSession);
                    setUser(newSession?.user ?? null);
                    if (newSession?.user) await loadProfile(newSession.user.id);
                    else setProfile(null);
                }
            );

            return () => {
                active = false;
                subscription.unsubscribe();
            };
        }

        initializeAuth();
    }, []);

    const signUp = async (email: string, password: string, displayName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } },
        });
        if (!error && data.user) await loadProfile(data.user.id);
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
        try { await AsyncStorage.clear(); } catch (e) { }
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) return { error: new Error('Not authenticated') };
        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
        if (!error) await loadProfile(user.id);
        return { error };
    };

    return (
        <AuthContext.Provider
            value={{ user, profile, session, loading, signUp, signIn, signOut, updateProfile, refreshWallet }}
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
