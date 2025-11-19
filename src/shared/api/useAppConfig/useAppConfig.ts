import { useQuery } from '@tanstack/react-query';

import type { AppConfig } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

/**
 * Fetches public app configuration from the database.
 *
 * Uses the RPC function `get_public_app_config` to retrieve application-wide
 * configuration settings. The configuration is cached by TanStack Query using
 * the query key `['appConfig']` and automatically refetches when the query
 * is invalidated or the component remounts.
 *
 * @returns {UseQueryResult<AppConfig, Error>} TanStack Query result containing the app configuration data, loading state, and error state
 *
 * @throws {Error} Throws an error if the database RPC call fails
 */
export function useAppConfig() {
  const supabase = useSupabase();

  return useQuery({
    queryFn: async (): Promise<AppConfig> => {
      const { data, error } = await supabase.rpc('get_public_app_config');

      if (error) {
        throw new Error(`Failed to fetch app config: ${error.message}`);
      }

      const config = new Map<string, string>();
      data.forEach(({ key, value }) => config.set(key, value));

      return {
        emailVerificationRequired: config.get('email_verification_required') === 'true',
        registrationEnabled: config.get('registration_enabled') === 'true',
      };
    },
    queryKey: ['appConfig'],
  });
}
