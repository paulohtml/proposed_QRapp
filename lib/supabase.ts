import { createClient } from '@supabase/supabase-js';

import { sessionStorage } from './secureStorage';

// Credentials come from .env (EXPO_PUBLIC_*) - never hard-code them in source.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Falls back to a harmless placeholder so the app can show a setup message
// instead of crashing at import time when .env is missing.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.invalid',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
