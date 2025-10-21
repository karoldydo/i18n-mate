import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse, CreateProjectWithDefaultLocaleRequest, ProjectResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../projects.errors';
import { PROJECTS_KEY_FACTORY } from '../projects.key-factory';
import { CREATE_PROJECT_SCHEMA, PROJECT_RESPONSE_SCHEMA } from '../projects.schemas';

/**
 * Create a new project with a default locale
 *
 * Uses the RPC function `create_project_with_default_locale` to create a
 * project and its initial default locale in a single transaction. The
 * database enforces prefix validation and uniqueness and will normalize
 * provided values according to schema rules.
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid prefix format, length constraints)
 * @throws {ApiErrorResponse} 409 - Conflict error (duplicate name or prefix for user)
 * @throws {ApiErrorResponse} 500 - Database error or no data returned
 *
 * @returns TanStack Query mutation hook for creating projects
 */
export function useCreateProject() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectResponse, ApiErrorResponse, CreateProjectWithDefaultLocaleRequest>({
    mutationFn: async (payload) => {
      const body = CREATE_PROJECT_SCHEMA.parse(payload);

      const { data, error } = await supabase.rpc('create_project_with_default_locale', body).maybeSingle();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useCreateProject', 'Failed to create project');
      }

      if (!data) {
        throw createApiErrorResponse(500, PROJECTS_ERROR_MESSAGES.NO_DATA_RETURNED);
      }

      return PROJECT_RESPONSE_SCHEMA.parse(data);
    },
    onSuccess: () => {
      // invalidate project list cache
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY_FACTORY.lists() });
    },
  });
}
