import { createContext, type ReactNode, useContext, useEffect, useMemo } from 'react';

import type { AppConfig } from '@/shared/types';

import { useAppConfig } from '@/shared/api/useAppConfig';

interface ConfigContextValue {
  config: AppConfig | undefined;
  error: Error | null;
  isLoading: boolean;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

interface ConfigProviderProps {
  children: ReactNode;
}

/**
 * ConfigProvider fetches and provides app configuration to all child components
 * Uses fail-closed approach: features are disabled until config confirms they're enabled
 */
export function ConfigProvider({ children }: ConfigProviderProps) {
  const { data: config, error, isLoading } = useAppConfig();

  useEffect(() => {
    if (error) {
      console.error('Failed to load app configuration:', error);
    }
  }, [error]);

  const value = useMemo(
    () => ({
      config,
      error,
      isLoading,
    }),
    [config, isLoading, error]
  );

  // If there's an error loading config, we still render children
  // but with undefined config (fail-closed: features disabled)
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

/**
 * Hook to access app configuration
 * @throws Error if used outside ConfigProvider
 * @returns ConfigContextValue with config, loading state, and error
 */
function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext);

  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }

  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export { useConfig };
