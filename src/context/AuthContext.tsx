// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { onAuthStateChange, getCurrentSession } from '@/src/services/supabase';
import { EmailService } from '@/src/services/EmailService';

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

// ─────────────────────────────────────────────────────────────
// Module-level flags (outside component so they survive re-renders)
// ─────────────────────────────────────────────────────────────
let authInitialized = false;
let authUnsubscribe: (() => void) | null = null;

// When the deep-link handler sends the user to /reset-password it sets
// this flag so that the subsequent SIGNED_IN event doesn't clobber the
// navigation by redirecting to the dashboard.
let suppressNextSignedIn = false;

// After a successful password update (USER_UPDATED event) the reset-password
// screen shows its own success card, so we suppress the auto-redirect here.
let suppressNextUserUpdated = false;

export function setSuppressNextSignedIn(value: boolean) {
    suppressNextSignedIn = value;
}

export function setSuppressNextUserUpdated(value: boolean) {
    suppressNextUserUpdated = value;
}

// ─────────────────────────────────────────────────────────────

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
                const session = await getCurrentSession();

                if (!mountedRef.current) return;

                if (session?.user) {
                    console.log('✅ User found:', session.user.email);
                    setUser(session.user);

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

        // Set up auth state listener
        authUnsubscribe = onAuthStateChange((event, session) => {
            console.log('🔥 Auth event:', event, session?.user?.email);

            if (!mountedRef.current) return;

            setUser(session?.user || null);

            switch (event) {
                case 'SIGNED_IN':
                    if (suppressNextSignedIn) {
                        suppressNextSignedIn = false;
                        console.log('🔕 SIGNED_IN redirect suppressed (password recovery flow)');
                        break;
                    }
                    // Send welcome email for brand-new accounts (created < 2 min ago)
                    if (session?.user) {
                        const createdAt = new Date(session.user.created_at).getTime();
                        const isNewUser = Date.now() - createdAt < 2 * 60 * 1000;
                        if (isNewUser && session.user.email) {
                            const name = session.user.user_metadata?.full_name
                                ?? session.user.email.split('@')[0];
                            EmailService.sendWelcomeEmail(session.user.email, name).catch(() => {});
                        }
                    }
                    setTimeout(() => {
                        if (!mountedRef.current) return;
                        if (session?.user?.email_confirmed_at) {
                            router.replace('/(tabs)/01_DashboardScreen');
                        } else {
                            router.replace('/verified-account');
                        }
                    }, 1500);
                    break;

                case 'SIGNED_OUT':
                    router.replace('/LoginScreen');
                    break;

                case 'USER_UPDATED':
                    // Consumed by the reset-password screen which shows its own
                    // success card and then signs the user out manually.
                    if (suppressNextUserUpdated) {
                        suppressNextUserUpdated = false;
                        console.log('🔕 USER_UPDATED redirect suppressed (password reset flow)');
                        break;
                    }
                    // Delay mirrors SIGNED_IN so account-settings password changes
                    // also have time to show feedback before redirecting.
                    setTimeout(() => {
                        if (!mountedRef.current) return;
                        if (session?.user?.email_confirmed_at) {
                            router.replace('/(tabs)/01_DashboardScreen');
                        }
                    }, 1500);
                    break;

                case 'PASSWORD_RECOVERY':
                    // Email reset link opened — go straight to the reset screen.
                    console.log('🔑 PASSWORD_RECOVERY event — navigating to reset-password');
                    router.replace('/reset-password');
                    break;
            }
        });

        return () => {
            console.log('🧹 Cleaning up AuthProvider');
            mountedRef.current = false;
            authInitialized = false;

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
