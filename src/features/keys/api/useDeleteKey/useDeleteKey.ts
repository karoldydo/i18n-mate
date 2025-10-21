import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { KEYS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../keys.errors';
import { KEYS_KEY_FACTORY } from '../keys.key-factory';
import { UUID_SCHEMA } from '../keys.schemas';

/**
 * Delete a translation key by ID
 *
 * Removes the key record and all associated translations via CASCADE DELETE.
 * Operation is irreversible and affects all locales in the project. RLS
 * policies ensure only project owners can delete keys. On success, related
 * caches are cleared and key lists are invalidated.
 *
 * @param projectId - Project UUID for cache invalidation (required)
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid key ID format)
 * @throws {ApiErrorResponse} 404 - Key not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during deletion
 *
 * @returns TanStack Query mutation hook for deleting keys
 */
export function useDeleteKey(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiErrorResponse, string>({
    mutationFn: async (uuid) => {
      const id = UUID_SCHEMA.parse(uuid);

      const { count, error } = await supabase.from('keys').delete().eq('id', id);

      if (error) {
        throw createDatabaseErrorResponse(error, 'useDeleteKey', 'Failed to delete key');
      }

      if (count === 0) {
        throw createApiErrorResponse(404, KEYS_ERROR_MESSAGES.KEY_NOT_FOUND);
      }
    },
    onSuccess: (_, uuid) => {
      // remove from cache
      queryClient.removeQueries({ queryKey: KEYS_KEY_FACTORY.detail(uuid) });
      // invalidate all list caches for this project
      queryClient.invalidateQueries({ queryKey: KEYS_KEY_FACTORY.defaultViews(projectId) });
      queryClient.invalidateQueries({ queryKey: KEYS_KEY_FACTORY.all });
    },
  });
}
