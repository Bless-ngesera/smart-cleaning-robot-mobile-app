import 'react-native-url-polyfill/auto';

import { createClient, SupabaseClient, Session, User, AuthError } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';
import * as Crypto from 'expo-crypto';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;
let appStateSubscription: { remove: () => void } | null = null;

/**
 * Initialize Supabase client (singleton pattern)
 */
function initializeSupabase(): SupabaseClient {
    if (supabaseInstance) {
        return supabaseInstance;
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Missing Supabase environment variables. Please configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
        );
    }

    // Create the client
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            storage: Platform.OS === 'web' ? undefined : AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
            flowType: 'pkce',
        },
        db: {
            schema: 'public',
        },
        global: {
            headers: {
                'X-Client-Info': 'smartcleaner-mobile',
            },
        },
    });

    // Handle app state changes for token refresh (mobile only)
    if (Platform.OS !== 'web') {
        // Clean up any existing subscription
        if (appStateSubscription) {
            appStateSubscription.remove();
        }

        // Create new subscription
        appStateSubscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                supabaseInstance?.auth.startAutoRefresh();
            } else {
                supabaseInstance?.auth.stopAutoRefresh();
            }
        });
    }

    console.log('[Supabase] Client initialized successfully');
    return supabaseInstance;
}

// Initialize immediately
export const supabase = initializeSupabase();

// ============================================================
// CLEANUP FUNCTION (optional - call when app unmounts)
// ============================================================
export function cleanupSupabase(): void {
    if (appStateSubscription) {
        appStateSubscription.remove();
        appStateSubscription = null;
    }
}

// ============================================================
// SESSION
// ============================================================

/**
 * Get current session (async)
 */
export async function getCurrentSession(): Promise<Session | null> {
    try {
        if (!supabase) {
            console.error('[Supabase] Client not initialized');
            return null;
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) {
            console.warn('[Supabase] getSession error:', error.message);
            return null;
        }

        return data?.session ?? null;
    } catch (err) {
        console.error('[Supabase] getSession failed:', err);
        return null;
    }
}

// ============================================================
// USER
// ============================================================

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
    try {
        if (!supabase) {
            console.error('[Supabase] Client not initialized');
            return null;
        }

        const { data, error } = await supabase.auth.getUser();

        if (error) {
            console.warn('[Supabase] getUser error:', error.message);
            return null;
        }

        return data?.user ?? null;
    } catch (err) {
        console.error('[Supabase] getUser failed:', err);
        return null;
    }
}

// ============================================================
// USER ID
// ============================================================

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
    const user = await getCurrentUser();
    return user?.id ?? null;
}

// ============================================================
// AUTH STATE LISTENER
// ============================================================

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export function onAuthStateChange(
    callback: (event: string, session: Session | null) => void
): () => void {
    if (!supabase) {
        console.error('[Supabase] Client not initialized');
        return () => {};
    }

    const { data } = supabase.auth.onAuthStateChange(callback);

    return () => {
        data?.subscription.unsubscribe();
    };
}

// ============================================================
// SIGN OUT
// ============================================================

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Client not initialized' };
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };

    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
        };
    }
}

// ============================================================
// REFRESH SESSION
// ============================================================

/**
 * Manually refresh the current session
 */
export async function refreshSession(): Promise<Session | null> {
    try {
        if (!supabase) {
            console.error('[Supabase] Client not initialized');
            return null;
        }

        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
            console.warn('[Supabase] refreshSession error:', error.message);
            return null;
        }

        return data?.session ?? null;

    } catch (err) {
        console.error('[Supabase] refreshSession failed:', err);
        return null;
    }
}

// ============================================================
// AUTH STATUS
// ============================================================

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
    const session = await getCurrentSession();
    return !!session?.user;
}

// ============================================================
// SIGN UP WITH ADDITIONAL CHECKS
// ============================================================

/**
 * Sign up with email and password
 * This is a wrapper around supabase.auth.signUp with additional logging
 */
export async function signUpWithEmail(
    email: string,
    password: string,
    options?: { data?: any; redirectTo?: string }
): Promise<{ data: any; error: AuthError | null }> {
    try {
        if (!supabase) {
            return { data: null, error: { message: 'Client not initialized', name: 'InitError' } as AuthError };
        }

        const { data, error } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options,
        });

        if (error) {
            console.error('[Supabase] signUp error:', error.message);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('[Supabase] signUp exception:', err);
        return {
            data: null,
            error: {
                message: err instanceof Error ? err.message : 'Unknown error',
                name: 'UnknownError'
            } as AuthError
        };
    }
}

// ============================================================
// SIGN IN WITH EMAIL
// ============================================================

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
    email: string,
    password: string
): Promise<{ data: any; error: AuthError | null }> {
    try {
        if (!supabase) {
            return { data: null, error: { message: 'Client not initialized', name: 'InitError' } as AuthError };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
        });

        if (error) {
            console.error('[Supabase] signIn error:', error.message);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('[Supabase] signIn exception:', err);
        return {
            data: null,
            error: {
                message: err instanceof Error ? err.message : 'Unknown error',
                name: 'UnknownError'
            } as AuthError
        };
    }
}

// ============================================================
// EXPORT OBJECT
// ============================================================

export default {
    supabase,
    getCurrentSession,
    getCurrentUser,
    getCurrentUserId,
    onAuthStateChange,
    signOut,
    refreshSession,
    isAuthenticated,
    signUpWithEmail,
    signInWithEmail,
    cleanupSupabase,
};