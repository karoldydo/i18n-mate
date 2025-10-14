import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { supabaseClient, type SupabaseClient } from '../../shared/api/supabase.client';

type SupabaseContextValue = SupabaseClient;

const SupabaseContext = createContext<null | SupabaseContextValue>(null);

interface SupabaseProviderProps {
  children: ReactNode;
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const value = useMemo(() => supabaseClient, []);
  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

function useSupabase(): SupabaseContextValue {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error('useSupabase must be used within SupabaseProvider');
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export { useSupabase };
