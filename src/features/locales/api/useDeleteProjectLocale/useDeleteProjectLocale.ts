import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../locales.errors';
import { UUID_SCHEMA } from '../locales.schemas';

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
 * @throws {ApiErrorResponse} 400 - Validation error (attempt to delete default locale)
 * @throws {ApiErrorResponse} 404 - Locale not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during deletion
 *
 * @returns TanStack Query mutation hook for deleting locales with cascade operations
 */
export function useDeleteProjectLocale() {
  const supabase = useSupabase();

  return useMutation<unknown, ApiErrorResponse, string>({
    mutationFn: async (uuid) => {
      const id = UUID_SCHEMA.parse(uuid);

      const { error } = await supabase.from('project_locales').delete().eq('id', id);

      if (error) {
        throw createDatabaseErrorResponse(error, 'useDeleteProjectLocale', 'Failed to delete locale');
      }
    },
  });
}
