import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse, ProjectResponse, UpdateProjectRequest } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../projects.errors';
import { projectsKeys } from '../projects.keys';
import { projectIdSchema, projectResponseSchema, updateProjectSchema } from '../projects.schemas';

/**
 * Context type for mutation callbacks
 */
interface UpdateProjectContext {
  previousProject?: ProjectResponse;
}

export function useUpdateProject(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectResponse, ApiErrorResponse, UpdateProjectRequest, UpdateProjectContext>({
    mutationFn: async (updateData) => {
      // Validate inputs
      const validatedId = projectIdSchema.parse(projectId);
      const validatedInput = updateProjectSchema.parse(updateData);

      const { data, error } = await supabase
        .from('projects')
        .update(validatedInput)
        .eq('id', validatedId)
        .select('id,name,description,prefix,default_locale,created_at,updated_at')
        .maybeSingle();

      // Handle database errors
      if (error) {
        throw createDatabaseErrorResponse(error, 'useUpdateProject', 'Failed to update project');
      }

      // Handle missing data (project not found or access denied)
      if (!data) {
        throw createApiErrorResponse(404, 'Project not found or access denied');
      }

      // Runtime validation of response data
      const validatedResponse = projectResponseSchema.parse(data);
      return validatedResponse;
    },
    onError: (_err, _newData, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(projectsKeys.detail(projectId), context.previousProject);
      }
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectsKeys.detail(projectId) });

      // Snapshot previous value
      const previousProject = queryClient.getQueryData<ProjectResponse>(projectsKeys.detail(projectId));

      // Optimistically update
      queryClient.setQueryData(projectsKeys.detail(projectId), (old: ProjectResponse | undefined) => {
        // Guard clause: prevent errors if cache is empty
        if (!old) return old;
        return {
          ...old,
          ...newData,
        };
      });

      return { previousProject };
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.lists() });
    },
  });
}
