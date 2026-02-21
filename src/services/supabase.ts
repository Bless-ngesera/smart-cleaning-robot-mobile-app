// src/services/supabase.ts
import 'react-native-url-polyfill/auto';

import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let supabase: SupabaseClient | null = null;

/**
 * Initialize Supabase client (singleton pattern - runs once)
 */
function initializeSupabase() {
    if (supabase) return supabase;

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        const errorMsg =
            'Missing Supabase environment variables!\n\n' +
            'Please add to your .env file (or app.json / app.config.js):\n' +
            'EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co\n' +
            'EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n\n' +
            'Current values:\n' +
            `URL: ${supabaseUrl ?? 'undefined'}\n` +
            `Key: ${supabaseAnonKey ? 'present' : 'undefined'}`;

        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    const { createClient } = require('@supabase/supabase-js');

    const storage = Platform.OS === 'web' ? undefined : AsyncStorage;

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            storage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false, // Important for native
            flowType: 'pkce',          // Recommended for mobile
        },
        db: {
            schema: 'public',
        },
        ...(process.env.NODE_ENV !== 'production' && { debug: true }),
    });

    // Optional: Handle app state changes to refresh tokens
    if (Platform.OS !== 'web') {
        const { AppState } = require('react-native');
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                supabase?.auth.startAutoRefresh();
            } else {
                supabase?.auth.stopAutoRefresh();
            }
        });

        // Note: subscription cleanup happens automatically on app close in most cases
    }

    console.log('[Supabase] Client initialized successfully');
    return supabase;
}

// Initialize immediately (singleton)
initializeSupabase();

/**
 * Export initialized client (safe to import and use directly)
 */
export { supabase };

/**
 * Get current session (sync after init)
 */
export function getCurrentSession(): Session | null {
    if (!supabase) {
        console.error('[Supabase] Client not initialized');
        return null;
    }

    const { data, error } = supabase.auth.getSession();
    if (error) {
        console.warn('[Supabase] getSession error:', error.message);
        return null;
    }

    return data.session;
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): User | null {
    const session = getCurrentSession();
    return session?.user ?? null;
}

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export function onAuthStateChange(
    callback: (event: string, session: Session | null) => void
) {
    if (!supabase) {
        console.error('[Supabase] Client not initialized');
        return () => {};
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
}

/**
 * Sign user out (with error handling)
 */
export async function signOut(): Promise<void> {
    if (!supabase) {
        console.error('[Supabase] Client not initialized');
        return;
    }

    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.warn('[Supabase] Sign out error:', error.message);
        }
    } catch (err) {
        console.error('[Supabase] Sign out failed:', err);
    }
}