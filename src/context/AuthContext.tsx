// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { onAuthStateChange, getCurrentSession } from '@/src/services/supabase';
import { AppState } from 'react-native';

type AuthContextType = {
    isLoading: boolean;
    user: any | null;
    initialized: boolean;
};

const AuthContext = createContext<AuthContextType>({
    isLoading: true,
    user: null,
    initialized: false
});

export const useAuth = () => useContext(AuthContext);

// Move initialization outside component to prevent recreation
let authInitialized = false;
let authUnsubscribe: (() => void) | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [initialized, setInitialized] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        // Prevent double initialization in StrictMode
        if (authInitialized) {
            console.log('⚠️ Auth already initialized, skipping...');
            setIsLoading(false);
            setInitialized(true);
            return;
        }

        authInitialized = true;
        console.log('🚀 AuthProvider initializing...');

        const initializeAuth = async () => {
            try {
                // Check current session
                const session = await getCurrentSession();

                if (!mountedRef.current) return;

                if (session?.user) {
                    console.log('✅ User found:', session.user.email);
                    setUser(session.user);

                    // Navigate based on verification status
                    if (session.user.email_confirmed_at) {
                        router.replace('/(tabs)/01_DashboardScreen');
                    } else {
                        router.replace('/verified-account');
                    }
                } else {
                    console.log('👤 No user found');
                    router.replace('/LoginScreen');
                }
            } catch (error) {
                console.error('❌ Auth initialization error:', error);
                if (mountedRef.current) {
                    router.replace('/LoginScreen');
                }
            } finally {
                if (mountedRef.current) {
                    setIsLoading(false);
                    setInitialized(true);
                }
            }
        };

        initializeAuth();

        // Set up auth listener
        authUnsubscribe = onAuthStateChange((event, session) => {
            console.log('🔥 Auth event:', event, session?.user?.email);

            if (!mountedRef.current) return;

            setUser(session?.user || null);

            switch (event) {
                case 'SIGNED_IN':
                    if (session?.user?.email_confirmed_at) {
                        router.replace('/(tabs)/01_DashboardScreen');
                    } else {
                        router.replace('/verified-account');
                    }
                    break;

                case 'SIGNED_OUT':
                    router.replace('/LoginScreen');
                    break;

                case 'USER_UPDATED':
                    if (session?.user?.email_confirmed_at) {
                        router.replace('/(tabs)/01_DashboardScreen');
                    }
                    break;

                case 'PASSWORD_RECOVERY':
                    router.replace('/reset-password');
                    break;
            }
        });

        return () => {
            console.log('🧹 Cleaning up AuthProvider');
            mountedRef.current = false;

            // Only unsubscribe, don't reset the initialized flag
            if (authUnsubscribe) {
                authUnsubscribe();
                authUnsubscribe = null;
            }
        };
    }, []);

    return (
        <AuthContext.Provider value={{ isLoading, user, initialized }}>
            {children}
        </AuthContext.Provider>
    );
}