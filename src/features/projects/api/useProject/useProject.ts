import { useQuery } from '@tanstack/react-query';

import type { ApiErrorResponse, ProjectResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../projects.errors';
import { PROJECTS_KEY_FACTORY } from '../projects.key-factory';
import { PROJECT_RESPONSE_SCHEMA, UUID_SCHEMA } from '../projects.schemas';

/**
 * Fetch a single project by ID
 *
 * Queries the `projects` table for the given ID with RLS-based access control
 * and validates the response against the runtime schema. Returns 404-style error
 * if the project is not found or the user has no access.
 *
 * @param projectId - UUID of the project to fetch
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid UUID format)
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns TanStack Query result with the project data
 */
export function useProject(projectId: string) {
  const supabase = useSupabase();

  return useQuery<ProjectResponse, ApiErrorResponse>({
    gcTime: 30 * 60 * 1000, // 30 minutes
    queryFn: async () => {
      const id = UUID_SCHEMA.parse(projectId);

      const { data, error } = await supabase
        .from('projects')
        .select('id,name,description,prefix,default_locale,created_at,updated_at')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProject', 'Failed to fetch project');
      }

      if (!data) {
        throw createApiErrorResponse(404, PROJECTS_ERROR_MESSAGES.PROJECT_NOT_FOUND);
      }

      return PROJECT_RESPONSE_SCHEMA.parse(data);
    },
    queryKey: PROJECTS_KEY_FACTORY.detail(projectId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
