import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse, CreateKeyRequest, CreateKeyResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { KEYS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../keys.errors';
import { keysKeys } from '../keys.keys';
import { createKeyResponseSchema, createKeySchema } from '../keys.schemas';

/**
 * Create a new translation key with default value
 *
 * Uses the RPC function `create_key_with_value` to create a key and its
 * default translation value in a single transaction. The database enforces
 * prefix validation, uniqueness, and triggers automatic fan-out to all locales.
 *
 * @param projectId - Project UUID for cache invalidation
 * @returns TanStack Query mutation hook
 */
export function useCreateKey(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<CreateKeyResponse, ApiErrorResponse, CreateKeyRequest>({
    mutationFn: async (keyData) => {
      // Validate input and transform to RPC parameter format (adds p_ prefix)
      const rpcParams = createKeySchema.parse(keyData);

      // Call RPC function to create key with default value
      // RPC returns TABLE(key_id uuid), PostgREST wraps in array
      // .single() extracts first element and enforces exactly 1 row returned
      const { data, error } = await supabase.rpc('create_key_with_value', rpcParams).single();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useCreateKey', 'Failed to create key');
      }

      if (!data) {
        throw createApiErrorResponse(500, KEYS_ERROR_MESSAGES.NO_DATA_RETURNED);
      }

      // Runtime validation of response data (already unwrapped by .single())
      const validatedResponse = createKeyResponseSchema.parse(data);
      return validatedResponse;
    },
    onSuccess: () => {
      // Invalidate all key list caches for this project (default and all per-language views)
      queryClient.invalidateQueries({ queryKey: keysKeys.defaultViews(projectId) });
      queryClient.invalidateQueries({ queryKey: keysKeys.all });
    },
  });
}
