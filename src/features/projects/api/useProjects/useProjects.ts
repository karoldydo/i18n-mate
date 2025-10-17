import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, ListProjectsParams, ProjectListResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../projects.errors';
import { projectsKeys } from '../projects.keys';
import { listProjectsSchema, projectWithCountsSchema } from '../projects.schemas';

export function useProjects(params: ListProjectsParams = {}) {
  const supabase = useSupabase();

  return useQuery<ProjectListResponse, ApiErrorResponse>({
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      // Validate parameters
      const validated = listProjectsSchema.parse(params);

      // Call RPC function for list with counts
      const { count, data, error } = await supabase
        .rpc('list_projects_with_counts', {
          p_limit: validated.limit,
          p_offset: validated.offset,
        })
        .order(validated.order?.split('.')[0] || 'name', {
          ascending: validated.order?.endsWith('.asc') ?? true,
        });

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProjects', 'Failed to fetch projects');
      }

      // Runtime validation of response data
      const projects = z.array(projectWithCountsSchema).parse(data || []);

      return {
        data: projects,
        metadata: {
          end: (validated.offset || 0) + projects.length - 1,
          start: validated.offset || 0,
          total: count || 0,
        },
      };
    },
    queryKey: projectsKeys.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
