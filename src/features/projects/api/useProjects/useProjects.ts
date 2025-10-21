import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, ListProjectsParams, ProjectListResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../projects.errors';
import { PROJECTS_KEY_FACTORY } from '../projects.key-factory';
import { LIST_PROJECTS_SCHEMA, PROJECT_WITH_COUNTS_SCHEMA } from '../projects.schemas';

/**
 * Fetch a paginated list of projects with counts
 *
 * Uses the RPC function `list_projects_with_counts` with exact total counting
 * enabled. Returns projects with aggregated locale and key counts. Data items
 * are validated at runtime and pagination metadata is computed from input params.
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

  return useQuery<ProjectListResponse, ApiErrorResponse>({
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      // validate parameters
      const validated = LIST_PROJECTS_SCHEMA.parse(params);

      // call rpc function for list with counts (enable exact total counting)
      const { count, data, error } = await supabase
        .rpc(
          'list_projects_with_counts',
          {
            p_limit: validated.limit,
            p_offset: validated.offset,
          },
          { count: 'exact' }
        )
        .order(validated.order?.split('.')[0] || 'name', {
          ascending: validated.order?.endsWith('.asc') ?? true,
        });

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProjects', 'Failed to fetch projects');
      }

      // runtime validation of response data
      const projects = z.array(PROJECT_WITH_COUNTS_SCHEMA).parse(data || []);

      return {
        data: projects,
        metadata: {
          end: (validated.offset || 0) + projects.length - 1,
          start: validated.offset || 0,
          total: count || 0,
        },
      };
    },
    queryKey: PROJECTS_KEY_FACTORY.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
