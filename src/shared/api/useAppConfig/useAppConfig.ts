import { useQuery } from '@tanstack/react-query';

import type { AppConfig } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

/**
 * Fetches public app configuration from the database
 * @returns TanStack Query result with AppConfig object
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
