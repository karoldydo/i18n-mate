import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, ProjectLocaleWithDefault } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../locales.errors';
import { localesKeys } from '../locales.keys';
import { listProjectLocalesWithDefaultSchema, projectLocaleWithDefaultSchema } from '../locales.schemas';

/**
 * Fetch all locales for a project with default locale indicator
 *
 * Uses the RPC function `list_project_locales_with_default` to retrieve
 * all locales for a project with an `is_default` flag indicating which
 * locale is the project's default language.
 *
 * @param projectId - UUID of the project
 * @returns TanStack Query result with array of locales
 */
export function useProjectLocales(projectId: string) {
  const supabase = useSupabase();

  return useQuery<ProjectLocaleWithDefault[], ApiErrorResponse>({
    gcTime: 30 * 60 * 1000, // 30 minutes
    queryFn: async () => {
      // Validate project ID
      const validated = listProjectLocalesWithDefaultSchema.parse({ project_id: projectId });

      // Call RPC function for list with is_default flag
      const { data, error } = await supabase.rpc('list_project_locales_with_default', {
        p_project_id: validated.project_id,
      });

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProjectLocales', 'Failed to fetch project locales');
      }

      if (!data) {
        throw createApiErrorResponse(500, 'No data returned from server');
      }

      // Runtime validation of response data
      const locales = z.array(projectLocaleWithDefaultSchema).parse(data);

      return locales;
    },
    queryKey: localesKeys.list(projectId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
