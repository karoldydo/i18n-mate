import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse, CreateProjectLocaleRequest, ProjectLocaleResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../locales.errors';
import { localesKeys } from '../locales.keys';
import { createProjectLocaleSchema, projectLocaleResponseSchema } from '../locales.schemas';

/**
 * Add a new locale to a project
 *
 * Creates a new locale entry for the project. The database will:
 * 1. Normalize the locale code to BCP-47 format (ll or ll-CC)
 * 2. Create translation records for all existing keys (fan-out)
 * 3. Set all new translations to NULL (missing translation)
 *
 * @param projectId - UUID of the project
 * @returns TanStack Query mutation hook
 */
export function useCreateProjectLocale(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectLocaleResponse, ApiErrorResponse, CreateProjectLocaleRequest>({
    mutationFn: async (localeData) => {
      // Validate input
      const validated = createProjectLocaleSchema.parse(localeData);

      // Insert locale (triggers normalization and fan-out)
      const { data, error } = await supabase.from('project_locales').insert(validated).select().single();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useCreateProjectLocale', 'Failed to add locale');
      }

      if (!data) {
        throw createApiErrorResponse(500, 'No data returned from server');
      }

      // Runtime validation of response data
      const validatedResponse = projectLocaleResponseSchema.parse(data);
      return validatedResponse;
    },
    onSuccess: () => {
      // Invalidate project locales list cache
      queryClient.invalidateQueries({ queryKey: localesKeys.list(projectId) });
    },
  });
}
