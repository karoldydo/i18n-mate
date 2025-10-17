import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  ApiErrorResponse,
  CreateProjectLocaleAtomicRequest,
  CreateProjectLocaleAtomicResponse,
} from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createAtomicLocaleErrorResponse } from '../locales.errors';
import { localesKeys } from '../locales.keys';
import { createProjectLocaleAtomicSchema } from '../locales.schemas';
import { normalizeLocaleCode } from '../locales.utils';

/**
 * Add a new locale to a project using atomic RPC function
 *
 * Creates a new locale entry for the project using the atomic approach. The database will:
 * 1. Validate authentication and project ownership
 * 2. Normalize the locale code to BCP-47 format (ll or ll-CC)
 * 3. Create locale record atomically
 * 4. Create translation records for all existing keys (fan-out)
 * 5. Verify fan-out completeness
 * 6. Emit telemetry events
 * 7. Rollback on any failures
 *
 * Advantages over simple POST approach:
 * - Built-in fan-out verification
 * - Better error reporting with specific error codes
 * - Atomic operation (all-or-nothing)
 * - Automatic telemetry event emission
 * - Enhanced retry logic for transient failures
 *
 * @param projectId - UUID of the project
 * @returns TanStack Query mutation hook
 */
export function useCreateProjectLocale(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<
    CreateProjectLocaleAtomicResponse,
    ApiErrorResponse,
    Omit<CreateProjectLocaleAtomicRequest, 'p_project_id'>
  >({
    mutationFn: async (localeData) => {
      // Normalize locale code before validation
      const normalizedLocale = normalizeLocaleCode(localeData.p_locale);

      // Validate input with normalized locale
      const validated = createProjectLocaleAtomicSchema.parse({
        ...localeData,
        p_locale: normalizedLocale,
        p_project_id: projectId,
      });

      // Call atomic RPC function
      const { data, error } = await supabase.rpc('create_project_locale_atomic', {
        p_label: validated.p_label,
        p_locale: validated.p_locale,
        p_project_id: validated.p_project_id,
      });

      if (error) {
        throw createAtomicLocaleErrorResponse(error, 'useCreateProjectLocale', 'Failed to add locale');
      }

      if (!data || data.length === 0) {
        throw createApiErrorResponse(500, 'No data returned from atomic locale creation');
      }

      // Return first (and only) result from RPC
      return data[0];
    },
    onSuccess: () => {
      // Invalidate project locales list cache
      queryClient.invalidateQueries({ queryKey: localesKeys.list(projectId) });
    },
    // Enhanced retry logic for atomic operations
    retry: (failureCount, error) => {
      // Don't retry authentication/authorization errors
      if (error?.error?.code === 401 || error?.error?.code === 403 || error?.error?.code === 404) {
        return false;
      }

      // Retry fan-out failures up to 2 times (transient issues)
      if (error?.error?.details?.code === 'FANOUT_INCOMPLETE' && failureCount < 2) {
        return true;
      }

      // Retry verification failures once
      if (error?.error?.details?.code === 'FANOUT_VERIFICATION_FAILED' && failureCount < 1) {
        return true;
      }

      // Don't retry conflict errors (locale already exists)
      if (error?.error?.code === 409) {
        return false;
      }

      // Default retry once for other errors
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff with jitter, max 5 seconds
      const baseDelay = 1000;
      const maxDelay = 5000;
      const exponentialDelay = baseDelay * Math.pow(2, attemptIndex);
      const jitter = Math.random() * 500; // Add 0-500ms jitter
      return Math.min(exponentialDelay + jitter, maxDelay);
    },
  });
}
