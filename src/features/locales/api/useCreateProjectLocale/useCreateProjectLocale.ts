import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse, CreateLocaleRequest, CreateLocaleResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { LOCALE_NORMALIZATION } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../locales.errors';
import { CREATE_LOCALE_SCHEMA, LOCALE_RESPONSE_SCHEMA } from '../locales.schemas';

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
 *
 * @param {string} projectId - UUID of the project to add locale to
 * @returns {ReturnType<typeof useMutation<CreateLocaleResponse, ApiErrorResponse, CreateLocaleRequest>>} TanStack Query mutation hook for adding locales
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid locale format, label constraints)
 * @throws {ApiErrorResponse} 401 - Authentication required
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 409 - Conflict error (locale already exists for project)
 * @throws {ApiErrorResponse} 500 - Database error, fan-out verification failed, or incomplete fan-out
 */
export function useCreateProjectLocale(projectId: string) {
  const supabase = useSupabase();

  return useMutation<CreateLocaleResponse, ApiErrorResponse, CreateLocaleRequest>({
    mutationFn: async (payload) => {
      // normalize locale code before validation
      const normalized = LOCALE_NORMALIZATION.normalize(payload.locale);

      // validate input with normalized locale
      const { label, locale } = CREATE_LOCALE_SCHEMA.parse({
        ...payload,
        locale: normalized,
      });

      const { data, error } = await supabase
        .rpc('create_project_locale_atomic', { p_label: label, p_locale: locale, p_project_id: projectId })
        .single();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useCreateProjectLocale', 'Failed to add locale');
      }

      if (!data) {
        throw createApiErrorResponse(500, 'No data returned from atomic locale creation');
      }

      return LOCALE_RESPONSE_SCHEMA.parse(data);
    },
  });
}
