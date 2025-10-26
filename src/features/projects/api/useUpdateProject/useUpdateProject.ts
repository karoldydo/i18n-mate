import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse, ProjectResponse, UpdateProjectRequest } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../projects.errors';
import { PROJECT_RESPONSE_SCHEMA, UPDATE_PROJECT_SCHEMA, UUID_SCHEMA } from '../projects.schemas';

/**
 * Update a project's fields
 *
 * Updates mutable project fields (name, description only).
 * Immutable fields (prefix, default_locale) are blocked.
 *
 * @param projectId - UUID of the project to update
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid UUID, attempt to change immutable fields)
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 409 - Conflict error (duplicate name for user)
 * @throws {ApiErrorResponse} 500 - Database error
 *
 * @returns TanStack Query mutation hook for updating projects
 */
export function useUpdateProject(projectId: string) {
  const supabase = useSupabase();

  return useMutation<ProjectResponse, ApiErrorResponse, UpdateProjectRequest>({
    mutationFn: async (payload) => {
      const id = UUID_SCHEMA.parse(projectId);
      const body = UPDATE_PROJECT_SCHEMA.parse(payload);

      const { data, error } = await supabase
        .from('projects')
        .update(body)
        .eq('id', id)
        .select('id,name,description,prefix,default_locale,created_at,updated_at')
        .maybeSingle();

      // handle database errors
      if (error) {
        throw createDatabaseErrorResponse(error, 'useUpdateProject', 'Failed to update project');
      }

      // handle missing data (project not found or access denied)
      if (!data) {
        throw createApiErrorResponse(404, PROJECTS_ERROR_MESSAGES.PROJECT_NOT_FOUND);
      }

      // runtime validation of response data
      return PROJECT_RESPONSE_SCHEMA.parse(data);
    },
  });
}
