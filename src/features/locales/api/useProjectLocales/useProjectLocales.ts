import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, ProjectLocaleWithDefault } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../locales.errors';
import { LOCALES_KEYS } from '../locales.key-factory';
import { LIST_PROJECT_LOCALES_WITH_DEFAULT_SCHEMA, PROJECT_LOCALE_WITH_DEFAULT_SCHEMA } from '../locales.schemas';

/**
 * Fetch all locales for a project with default locale indicator
 *
 * Uses the RPC function `list_project_locales_with_default` to retrieve
 * all locales for a project with an `is_default` flag indicating which
 * locale is the project's default language. Results are ordered with
 * the default locale first.
 *
 * @param projectId - UUID of the project to fetch locales for
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid UUID format)
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns TanStack Query result with array of locales including is_default flag
 */
export function useProjectLocales(projectId: string) {
  const supabase = useSupabase();

  return useQuery<ProjectLocaleWithDefault[], ApiErrorResponse>({
    gcTime: 30 * 60 * 1000, // 30 minutes
    queryFn: async () => {
      const { p_project_id } = LIST_PROJECT_LOCALES_WITH_DEFAULT_SCHEMA.parse({ project_id: projectId });

      const { data, error } = await supabase.rpc('list_project_locales_with_default', { p_project_id });

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProjectLocales', 'Failed to fetch project locales');
      }

      if (!data) {
        throw createApiErrorResponse(500, 'No data returned from server');
      }

      // runtime validation of response data
      return z.array(PROJECT_LOCALE_WITH_DEFAULT_SCHEMA).parse(data);
    },
    queryKey: LOCALES_KEYS.list(projectId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
