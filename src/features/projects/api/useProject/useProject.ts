import { useQuery } from '@tanstack/react-query';

import type { ApiErrorResponse, ProjectResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../projects.errors';
import { projectsKeys } from '../projects.keys';
import { projectIdSchema, projectResponseSchema } from '../projects.schemas';

export function useProject(projectId: string) {
  const supabase = useSupabase();

  return useQuery<ProjectResponse, ApiErrorResponse>({
    gcTime: 30 * 60 * 1000, // 30 minutes
    queryFn: async () => {
      // Validate project ID
      const validatedId = projectIdSchema.parse(projectId);

      const { data, error } = await supabase
        .from('projects')
        .select('id,name,description,prefix,default_locale,created_at,updated_at')
        .eq('id', validatedId)
        .maybeSingle();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProject', 'Failed to fetch project');
      }

      if (!data) {
        throw createApiErrorResponse(404, 'Project not found or access denied');
      }

      // Runtime validation of response data
      const validatedResponse = projectResponseSchema.parse(data);
      return validatedResponse;
    },
    queryKey: projectsKeys.detail(projectId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
