import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { KEYS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../keys.errors';
import { keysKeys } from '../keys.keys';

const keyIdSchema = z.string().uuid('Invalid key ID format');

/**
 * Delete a translation key by ID
 *
 * Removes the key record and all associated translations via CASCADE DELETE.
 * Operation is irreversible and affects all locales in the project. RLS
 * policies ensure only project owners can delete keys. On success, related
 * caches are cleared and key lists are invalidated.
 *
 * @param projectId - Project UUID for cache invalidation (required)
 * @throws {ApiErrorResponse} 400 - Validation error (invalid key ID format)
 * @throws {ApiErrorResponse} 404 - Key not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during deletion
 * @returns TanStack Query mutation hook for deleting keys
 */
export function useDeleteKey(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiErrorResponse, string>({
    mutationFn: async (keyId) => {
      // Validate key ID
      const validatedId = keyIdSchema.parse(keyId);

      // Supabase returns { count, error } not HTTP 204
      // We normalize to void (equivalent to 204 No Content semantics)
      const { count, error } = await supabase.from('keys').delete().eq('id', validatedId);

      if (error) {
        throw createDatabaseErrorResponse(error, 'useDeleteKey', 'Failed to delete key');
      }

      if (count === 0) {
        throw createApiErrorResponse(404, KEYS_ERROR_MESSAGES.KEY_NOT_FOUND);
      }

      // Return void (no content) to match REST 204 semantics
    },
    onSuccess: (_, keyId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: keysKeys.detail(keyId) });
      // Invalidate all list caches for this project
      queryClient.invalidateQueries({ queryKey: keysKeys.defaultViews(projectId) });
      queryClient.invalidateQueries({ queryKey: keysKeys.all });
    },
  });
}
