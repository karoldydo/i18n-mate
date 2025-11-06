import { useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, ListProjectsParams, ProjectListResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../projects.errors';
import { LIST_PROJECTS_SCHEMA, PROJECT_WITH_COUNTS_SCHEMA } from '../projects.schemas';

/**
 * Fetch a paginated list of projects with counts
 *
 * Uses the RPC function `list_projects_with_counts` which returns projects with
 * aggregated locale and key counts, plus total count for pagination. Data items
 * are validated at runtime and pagination metadata includes the total count.
 *
 * @param params - Optional listing parameters (limit, offset, order)
 * @param params.limit - Items per page (1-100, default: 50)
 * @param params.offset - Pagination offset (min: 0, default: 0)
 * @param params.order - Sort order (name.asc|desc, created_at.asc|desc, default: name.asc)
 *
 * @throws {ApiErrorResponse} 400 - Validation error (limit > 100, negative offset)
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns TanStack Query result with projects data and pagination metadata
 */
export function useProjects(params: ListProjectsParams = {}) {
  const supabase = useSupabase();

  return useSuspenseQuery<ProjectListResponse, ApiErrorResponse>({
    queryFn: async () => {
      const { limit, offset, order } = LIST_PROJECTS_SCHEMA.parse(params);

      const { data, error } = await supabase
        .rpc('list_projects_with_counts', { p_limit: limit, p_offset: offset })
        .order(order?.split('.')[0] || 'name', {
          ascending: order?.endsWith('.asc') ?? true,
        });

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProjects', 'Failed to fetch projects');
      }

      // runtime validation of response data
      const projects = z.array(PROJECT_WITH_COUNTS_SCHEMA).parse(data || []);

      // get total count from first record (all records have the same total_count)
      const totalCount = projects[0]?.total_count ?? 0;

      return {
        data: projects,
        metadata: {
          end: (offset || 0) + projects.length - 1,
          start: offset || 0,
          total: totalCount,
        },
      };
    },
    queryKey: ['projects', 'list', params],
  });
}
