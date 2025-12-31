import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string) => Promise<void>; // Magic Link (simplest)
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 0. CHECK FOR BYPASS (DEV MODE)
        const isBypass = import.meta.env.VITE_AUTH_BYPASS === 'true';

        if (isBypass) {
            console.warn("⚠️ AUTH BYPASS ENABLED: Logging in as Mock User");
            setUser({
                id: 'mock-id',
                email: 'bypass@integralq.com',
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString()
            } as User);
            setLoading(false);
            return; // EXIT EARLY: Do not check real session
        }

        // 1. Check active session on load with timeout fallback
        const checkSession = async () => {
            try {
                const { data } = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise<{ data: { session: null } }>((resolve) => setTimeout(() => resolve({ data: { session: null } }), 1000))
                ]);
                setUser(data.session?.user ?? null);
            } catch (error) {
                console.warn("Auth check failed:", error);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        // 2. Listen for changes (Login/Logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        if (error) throw error;
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
