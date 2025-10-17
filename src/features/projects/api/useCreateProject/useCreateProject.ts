import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse, CreateProjectWithDefaultLocaleRequest, ProjectResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../projects.errors';
import { projectsKeys } from '../projects.keys';
import { createProjectSchema, projectResponseSchema } from '../projects.schemas';

/**
 * Create a new project with a default locale
 *
 * Uses the RPC function `create_project_with_default_locale` to create a
 * project and its initial default locale in a single transaction. The
 * database enforces prefix validation and uniqueness and will normalize
 * provided values according to schema rules.
 *
 * @returns TanStack Query mutation hook
 */
export function useCreateProject() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectResponse, ApiErrorResponse, CreateProjectWithDefaultLocaleRequest>({
    mutationFn: async (projectData) => {
      // Validate input and transform to RPC parameter format (adds p_ prefix)
      const rpcParams = createProjectSchema.parse(projectData);

      // Call RPC function to create project with default locale
      // Note: Type cast needed because Supabase generates p_description as string|undefined
      // but SQL function accepts NULL. This is a limitation of Supabase type generation.
      const { data, error } = await supabase
        .rpc('create_project_with_default_locale', {
          ...rpcParams,
          p_description: rpcParams.p_description as unknown as string | undefined,
        })
        .maybeSingle();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useCreateProject', 'Failed to create project');
      }

      if (!data) {
        throw createApiErrorResponse(500, PROJECTS_ERROR_MESSAGES.NO_DATA_RETURNED);
      }

      // Runtime validation of response data
      const validatedResponse = projectResponseSchema.parse(data);
      return validatedResponse;
    },
    onSuccess: () => {
      // Invalidate project list cache
      queryClient.invalidateQueries({ queryKey: projectsKeys.lists() });
    },
  });
}
