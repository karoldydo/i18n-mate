import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../projects.errors';
import { UUID_SCHEMA } from '../projects.schemas';

/**
 * Delete a project by ID
 *
 * Removes the project record with cascading deletion of related data (locales,
 * keys, translations) handled by database constraints. Operation is irreversible.
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid UUID format)
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during deletion
 *
 * @returns {UseMutationResult<unknown, ApiErrorResponse, string>} TanStack Query mutation hook for deleting projects
 */
export function useDeleteProject() {
  const supabase = useSupabase();

  return useMutation<unknown, ApiErrorResponse, string>({
    mutationFn: async (projectId) => {
      const id = UUID_SCHEMA.parse(projectId);

      const { count, error } = await supabase.from('projects').delete().eq('id', id);

      if (error) {
        throw createDatabaseErrorResponse(error, 'useDeleteProject', 'Failed to delete project');
      }

      if (count === 0) {
        throw createApiErrorResponse(404, PROJECTS_ERROR_MESSAGES.PROJECT_NOT_FOUND);
      }
    },
  });
}
