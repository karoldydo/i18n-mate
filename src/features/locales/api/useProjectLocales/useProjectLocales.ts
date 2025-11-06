import { useSuspenseQuery } from '@tanstack/react-query';

import type { ApiErrorResponse, LocalesResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../locales.errors';
import { LOCALES_RESPONSE_SCHEMA, UUID_SCHEMA } from '../locales.schemas';

/**
 * Fetch all locales for a project with default locale indicator
 *
 * Uses the RPC function `list_project_locales_with_default` to retrieve
 * all locales for a project with an `is_default` flag indicating which
 * locale is the project's default language. Results are ordered with
 * the default locale first.
 *
 * Uses useSuspenseQuery for automatic loading state handling via Suspense boundary.
 *
 * @param projectId - UUID of the project to fetch locales for
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid UUID format)
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns TanStack Query result with array of locales including is_default flag
 */
export function useProjectLocales(projectId: string) {
  const supabase = useSupabase();

  return useSuspenseQuery<LocalesResponse, ApiErrorResponse>({
    queryFn: async () => {
      const p_project_id = UUID_SCHEMA.parse(projectId);

      const { data, error } = await supabase.rpc('list_project_locales_with_default', { p_project_id });

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProjectLocales', 'Failed to fetch project locales');
      }

      if (!data) {
        throw createApiErrorResponse(500, 'No data returned from server');
      }

      // runtime validation of response data
      return LOCALES_RESPONSE_SCHEMA.parse(data);
    },
    queryKey: ['project-locales', projectId],
  });
}
