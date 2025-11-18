import { useSuspenseQuery } from '@tanstack/react-query';

import type { ApiErrorResponse, ProjectResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../projects.errors';
import { PROJECT_RESPONSE_SCHEMA, UUID_SCHEMA } from '../projects.schemas';

/**
 * Fetch a single project by ID with counts
 *
 * Uses the RPC function `get_project_with_counts` which returns project data with
 * aggregated locale and key counts. Data is validated at runtime and returns a
 * 404-style error if the project is not found or the user has no access.
 *
 * @param {string} projectId - UUID of the project to fetch
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid UUID format)
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns {UseSuspenseQueryResult<ProjectResponse, ApiErrorResponse>} TanStack Query result with the project data and counts
 */
export function useProject(projectId: string) {
  const supabase = useSupabase();

  return useSuspenseQuery<ProjectResponse, ApiErrorResponse>({
    queryFn: async () => {
      const id = UUID_SCHEMA.parse(projectId);

      const { data, error } = await supabase.rpc('get_project_with_counts', { p_project_id: id }).maybeSingle();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProject', 'Failed to fetch project');
      }

      if (!data) {
        throw createApiErrorResponse(404, PROJECTS_ERROR_MESSAGES.PROJECT_NOT_FOUND);
      }

      return PROJECT_RESPONSE_SCHEMA.parse(data);
    },
    queryKey: ['projects', 'detail', projectId],
  });
}
