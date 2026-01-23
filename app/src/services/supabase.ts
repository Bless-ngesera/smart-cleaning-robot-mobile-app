// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';  // from Supabase dashboard
const supabaseAnonKey = 'YOUR_ANON_KEY';  // from Supabase dashboard

export const supabase = createClient(supabaseUrl, supabaseAnonKey);