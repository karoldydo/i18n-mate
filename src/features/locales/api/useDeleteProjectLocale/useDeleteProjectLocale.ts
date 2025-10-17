import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../locales.errors';
import { localesKeys } from '../locales.keys';
import { localeIdSchema } from '../locales.schemas';

/**
 * Delete a locale from a project
 *
 * Removes a locale and all associated translations. The database will:
 * 1. Prevent deletion if the locale is the project's default language
 * 2. CASCADE delete all translation records for this locale
 *
 * @param projectId - UUID of the project
 * @returns TanStack Query mutation hook
 */
export function useDeleteProjectLocale(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiErrorResponse, string>({
    mutationFn: async (localeId) => {
      // Validate locale ID
      const validatedId = localeIdSchema.parse(localeId);

      const { error } = await supabase.from('project_locales').delete().eq('id', validatedId);

      if (error) {
        throw createDatabaseErrorResponse(error, 'useDeleteProjectLocale', 'Failed to delete locale');
      }
    },
    onSuccess: () => {
      // Invalidate project locales list cache
      queryClient.invalidateQueries({ queryKey: localesKeys.list(projectId) });
    },
  });
}
