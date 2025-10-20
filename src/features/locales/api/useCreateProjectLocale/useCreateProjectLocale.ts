import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  ApiErrorResponse,
  CreateProjectLocaleAtomicRequest,
  CreateProjectLocaleAtomicResponse,
} from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { LOCALE_NORMALIZATION } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createAtomicLocaleErrorResponse } from '../locales.errors';
import { LOCALES_KEYS } from '../locales.key-factory';
import { CREATE_PROJECT_LOCALE_ATOMIC_SCHEMA } from '../locales.schemas';

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
 * @param projectId - UUID of the project to add locale to
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid locale format, label constraints)
 * @throws {ApiErrorResponse} 401 - Authentication required
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 409 - Conflict error (locale already exists for project)
 * @throws {ApiErrorResponse} 500 - Database error, fan-out verification failed, or incomplete fan-out
 *
 * @returns TanStack Query mutation hook for adding locales with enhanced retry logic
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
      // normalize locale code before validation
      const NORMALIZED_LOCALE = LOCALE_NORMALIZATION.normalize(localeData.p_locale);

      // validate input with normalized locale
      const VALIDATED = CREATE_PROJECT_LOCALE_ATOMIC_SCHEMA.parse({
        ...localeData,
        p_locale: NORMALIZED_LOCALE,
        p_project_id: projectId,
      });

      // call atomic rpc function
      const { data, error } = await supabase.rpc('create_project_locale_atomic', {
        p_label: VALIDATED.p_label,
        p_locale: VALIDATED.p_locale,
        p_project_id: VALIDATED.p_project_id,
      });

      if (error) {
        throw createAtomicLocaleErrorResponse(error, 'useCreateProjectLocale', 'Failed to add locale');
      }

      if (!data || data.length === 0) {
        throw createApiErrorResponse(500, 'No data returned from atomic locale creation');
      }

      // return first (and only) result from rpc
      return data[0];
    },
    onSuccess: () => {
      // invalidate project locales list cache
      queryClient.invalidateQueries({ queryKey: LOCALES_KEYS.list(projectId) });
    },
    // enhanced retry logic for atomic operations
    retry: (failureCount, error) => {
      // don't retry authentication/authorization errors
      if (error?.error?.code === 401 || error?.error?.code === 403 || error?.error?.code === 404) {
        return false;
      }

      // retry fan-out failures up to 2 times (transient issues)
      if (error?.error?.details?.code === 'FANOUT_INCOMPLETE' && failureCount < 2) {
        return true;
      }

      // retry verification failures once
      if (error?.error?.details?.code === 'FANOUT_VERIFICATION_FAILED' && failureCount < 1) {
        return true;
      }

      // don't retry conflict errors (locale already exists)
      if (error?.error?.code === 409) {
        return false;
      }

      // default retry once for other errors
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => {
      // exponential backoff with jitter, max 5 seconds
      const BASE_DELAY = 1000;
      const MAX_DELAY = 5000;
      const EXPONENTIAL_DELAY = BASE_DELAY * Math.pow(2, attemptIndex);
      const JITTER = Math.random() * 500; // add 0-500ms jitter
      return Math.min(EXPONENTIAL_DELAY + JITTER, MAX_DELAY);
    },
  });
}
