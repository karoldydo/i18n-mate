import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../projects.errors';
import { projectsKeys } from '../projects.keys';
import { projectIdSchema } from '../projects.schemas';

/**
 * Delete a project by ID
 *
 * Removes the project record. Associated data (locales, keys, translations)
 * are handled by database constraints/triggers. On success, related caches
 * are cleared and the project list is invalidated.
 *
 * @returns TanStack Query mutation hook
 */
export function useDeleteProject() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiErrorResponse, string>({
    mutationFn: async (projectId) => {
      // Validate project ID
      const validatedId = projectIdSchema.parse(projectId);

      const { count, error } = await supabase.from('projects').delete().eq('id', validatedId);

      if (error) {
        throw createDatabaseErrorResponse(error, 'useDeleteProject', 'Failed to delete project');
      }

      if (count === 0) {
        throw createApiErrorResponse(404, PROJECTS_ERROR_MESSAGES.PROJECT_NOT_FOUND);
      }
    },
    onSuccess: (_, projectId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: projectsKeys.detail(projectId) });
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: projectsKeys.lists() });
    },
  });
}
