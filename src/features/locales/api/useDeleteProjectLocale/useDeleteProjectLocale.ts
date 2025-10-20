import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../locales.errors';
import { LOCALES_KEYS } from '../locales.key-factory';
import { LOCALE_ID_SCHEMA } from '../locales.schemas';

/**
 * Delete a locale from a project with cascading deletion
 *
 * Removes a locale and all associated translations. The operation is
 * irreversible and handles cascading deletion of related data. The database
 * prevents deletion of the project's default locale via trigger.
 *
 * Database operations:
 * 1. Validate that locale is not the project's default language
 * 2. CASCADE delete all translation records for this locale
 * 3. Remove locale record
 *
 * @param projectId - UUID of the project containing the locale
 *
 * @throws {ApiErrorResponse} 400 - Validation error (attempt to delete default locale)
 * @throws {ApiErrorResponse} 404 - Locale not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during deletion
 *
 * @returns TanStack Query mutation hook for deleting locales with cascade operations
 */
export function useDeleteProjectLocale(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiErrorResponse, string>({
    mutationFn: async (localeId) => {
      // validate locale id
      const VALIDATED_ID = LOCALE_ID_SCHEMA.parse(localeId);

      const { error } = await supabase.from('project_locales').delete().eq('id', VALIDATED_ID);

      if (error) {
        throw createDatabaseErrorResponse(error, 'useDeleteProjectLocale', 'Failed to delete locale');
      }
    },
    onSuccess: () => {
      // invalidate project locales list cache
      queryClient.invalidateQueries({ queryKey: LOCALES_KEYS.list(projectId) });
    },
  });
}
