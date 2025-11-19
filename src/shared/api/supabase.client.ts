import { createClient, type SupabaseClient as RawSupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not set');
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not set');
}

/**
 * Typed Supabase client for the application database schema.
 * Provides type-safe access to all database tables, functions, and types.
 */
export type SupabaseClient = RawSupabaseClient<Database>;

/**
 * Singleton Supabase client instance configured with authentication settings.
 * Automatically refreshes tokens, detects sessions in URL, and persists sessions.
 * Throws an error during module initialization if required environment variables are missing.
 *
 * @throws {Error} Throws if VITE_SUPABASE_URL is not set
 * @throws {Error} Throws if VITE_SUPABASE_ANON_KEY is not set
 */
export const supabaseClient: SupabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});
