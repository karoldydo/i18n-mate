import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse, CreateKeyRequest, CreateKeyResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { KEYS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../keys.errors';
import { KEYS_KEY_FACTORY } from '../keys.key-factory';
import { CREATE_KEY_RESPONSE_SCHEMA, CREATE_KEY_SCHEMA } from '../keys.schemas';

/**
 * Create a new translation key with default value
 *
 * Uses the RPC function `create_key_with_value` to create a key and its
 * default translation value in a single transaction. The database enforces
 * prefix validation, uniqueness, and triggers automatic fan-out to all locales
 * with NULL values. Key name must start with project prefix and follow naming rules.
 *
 * @param projectId - Project UUID for cache invalidation (required)
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid key format, empty value, prefix mismatch)
 * @throws {ApiErrorResponse} 409 - Conflict error (duplicate key name in project)
 * @throws {ApiErrorResponse} 500 - Database error or no data returned
 *
 * @returns TanStack Query mutation hook for creating keys
 */
export function useCreateKey(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<CreateKeyResponse, ApiErrorResponse, CreateKeyRequest>({
    mutationFn: async (keyData) => {
      const validated = CREATE_KEY_SCHEMA.parse(keyData);

      const { data, error } = await supabase.rpc('create_key_with_value', validated).single();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useCreateKey', 'Failed to create key');
      }

      if (!data) {
        throw createApiErrorResponse(500, KEYS_ERROR_MESSAGES.NO_DATA_RETURNED);
      }

      return CREATE_KEY_RESPONSE_SCHEMA.parse(data);
    },
    onSuccess: () => {
      // invalidate all key list caches for this project (default and all per-language views)
      queryClient.invalidateQueries({ queryKey: KEYS_KEY_FACTORY.defaultViews(projectId) });
      queryClient.invalidateQueries({ queryKey: KEYS_KEY_FACTORY.all });
    },
  });
}
