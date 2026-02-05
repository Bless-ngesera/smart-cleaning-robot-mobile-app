// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Validate environment variables at runtime (prevents silent failures)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables.\n' +
        'Please add the following to your .env file:\n' +
        'EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co\n' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce', // Recommended for mobile/Expo apps (improves security)
        // Prevents lock timeout spam – you had this already
        lockAcquireTimeout: 30000, // 30 seconds
    },
    // Optional: enable debug logs temporarily to see real auth errors
    // Remove or set to false in production
    debug: true,
});