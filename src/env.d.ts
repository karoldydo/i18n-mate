/// <reference types="vite/client" />

import type { SupabaseClient } from './shared/api/supabase.client';
import type { Database } from './shared/types/database.types';

declare global {
  // Add shared global types here if needed
}

// Re-export the app-wide SupabaseClient type for convenience
export type AppSupabaseClient = SupabaseClient & { _db?: Database };

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_URL: string;
}
