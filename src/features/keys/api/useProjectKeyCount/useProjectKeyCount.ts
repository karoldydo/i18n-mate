import { useSuspenseQuery } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../keys.errors';
import { LIST_KEYS_DEFAULT_VIEW_SCHEMA, UUID_SCHEMA } from '../keys.schemas';

/**
 * Fetch the total count of keys for a project
 *
 * Uses the RPC function `list_keys_default_view` to get exact count
 * without fetching the actual key data. This provides efficient
 * key counting for project statistics.
 *
 * @param projectId - Project UUID to count keys for
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid project_id)
 * @throws {ApiErrorResponse} 403 - Project not owned by user
 * @throws {ApiErrorResponse} 500 - Database error during count
 *
 * Uses useSuspenseQuery so loading states are handled by the nearest Suspense boundary.
 *
 * @returns TanStack Query result with key count
 */
export function useProjectKeyCount(projectId: string) {
  const supabase = useSupabase();

  return useSuspenseQuery<number, ApiErrorResponse>({
    queryFn: async () => {
      const validatedProjectId = UUID_SCHEMA.parse(projectId);

      const params = LIST_KEYS_DEFAULT_VIEW_SCHEMA.parse({
        limit: 1, // We only need count, so limit to 1
        offset: 0,
        project_id: validatedProjectId,
      });

      const { count, error } = await supabase.rpc(
        'list_keys_default_view',
        {
          p_limit: params.limit,
          p_missing_only: params.missing_only,
          p_offset: params.offset,
          p_project_id: params.project_id,
          p_search: params.search,
        },
        { count: 'exact' }
      );

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProjectKeyCount', 'Failed to count project keys');
      }

      if (count === null) {
        throw createApiErrorResponse(500, 'Unable to retrieve key count');
      }

      return count;
    },
    queryKey: ['project-key-count', projectId],
  });
}
