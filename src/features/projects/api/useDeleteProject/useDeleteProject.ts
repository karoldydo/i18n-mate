import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../projects.errors';
import { PROJECTS_KEY_FACTORY } from '../projects.key-factory';
import { PROJECT_ID_SCHEMA } from '../projects.schemas';

/**
 * Delete a project by ID
 *
 * Removes the project record with cascading deletion of related data (locales,
 * keys, translations) handled by database constraints. Operation is irreversible.
 * On success, related caches are cleared and the project list is invalidated.
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid UUID format)
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during deletion
 *
 * @returns TanStack Query mutation hook for deleting projects
 */
export function useDeleteProject() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiErrorResponse, string>({
    mutationFn: async (projectId) => {
      // validate project id
      const validatedId = PROJECT_ID_SCHEMA.parse(projectId);

      const { count, error } = await supabase.from('projects').delete().eq('id', validatedId);

      if (error) {
        throw createDatabaseErrorResponse(error, 'useDeleteProject', 'Failed to delete project');
      }

      if (count === 0) {
        throw createApiErrorResponse(404, PROJECTS_ERROR_MESSAGES.PROJECT_NOT_FOUND);
      }
    },
    onSuccess: (_, projectId) => {
      // remove from cache
      queryClient.removeQueries({ queryKey: PROJECTS_KEY_FACTORY.detail(projectId) });
      // invalidate list
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY_FACTORY.lists() });
    },
  });
}
