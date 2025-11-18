import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse, CreateKeyRequest, CreateKeyResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { KEYS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../keys.errors';
import { CREATE_KEY_RESPONSE_SCHEMA, CREATE_KEY_SCHEMA } from '../keys.schemas';

/**
 * Create a new translation key with default value
 *
 * Uses the RPC function `create_key_with_value` to create a key and its
 * default translation value in a single transaction. The database enforces
 * prefix validation, uniqueness, and triggers automatic fan-out to all locales
 * with NULL values. Key name must start with project prefix and follow naming rules.
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid key format, empty value, prefix mismatch)
 * @throws {ApiErrorResponse} 409 - Conflict error (duplicate key name in project)
 * @throws {ApiErrorResponse} 500 - Database error or no data returned
 *
 * @returns {UseMutationResult<CreateKeyResponse, ApiErrorResponse, CreateKeyRequest>} TanStack Query mutation hook for creating keys
 */
export function useCreateKey() {
  const supabase = useSupabase();

  return useMutation<CreateKeyResponse, ApiErrorResponse, CreateKeyRequest>({
    mutationFn: async (payload) => {
      // get project prefix for validation (also verifies project exists)
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('prefix')
        .eq('id', payload.project_id)
        .maybeSingle();

      if (projectError) {
        throw createDatabaseErrorResponse(projectError, 'useCreateKey', 'Failed to fetch project prefix');
      }

      if (!projectData) {
        throw createApiErrorResponse(404, KEYS_ERROR_MESSAGES.PROJECT_NOT_OWNED);
      }

      // validate that full_key starts with project prefix + "."
      const expectedPrefix = `${projectData.prefix}.`;
      if (!payload.full_key.startsWith(expectedPrefix)) {
        throw createApiErrorResponse(400, KEYS_ERROR_MESSAGES.KEY_INVALID_PREFIX);
      }

      // transform to RPC format (includes validation)
      const { p_default_value, p_full_key, p_project_id } = CREATE_KEY_SCHEMA.parse(payload);

      const { data, error } = await supabase
        .rpc('create_key_with_value', {
          p_default_value,
          p_full_key,
          p_project_id,
        })
        .single();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useCreateKey', 'Failed to create key');
      }

      if (!data) {
        throw createApiErrorResponse(500, KEYS_ERROR_MESSAGES.NO_DATA_RETURNED);
      }

      return CREATE_KEY_RESPONSE_SCHEMA.parse(data);
    },
  });
}
