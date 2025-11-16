import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse, TranslationResponse, UpdateTranslationRequest } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../translations.errors';
import { TRANSLATION_RESPONSE_SCHEMA, UPDATE_TRANSLATION_REQUEST_BODY_SCHEMA } from '../translations.schemas';

/**
 * Update a translation value with all parameters in payload
 *
 * TanStack Query mutation hook for updating translation values in the database.
 * Accepts all parameters (project_id, key_id, locale) in the mutation payload
 * instead of hook initialization, allowing updating different translations
 * without recreating the hook instance.
 *
 * Features:
 * - Validates request body using Zod schema before database update
 * - Supports optimistic locking via updated_at timestamp (prevents concurrent modification)
 * - Validates response data using Zod schema for runtime type safety
 * - Handles database errors with structured error responses
 * - Updates translation metadata (is_machine_translated, updated_by_user_id, updated_source)
 *
 * The mutation performs:
 * 1. Request body validation (value, is_machine_translated, updated_by_user_id, updated_source)
 * 2. Database update with composite key matching (project_id, key_id, locale)
 * 3. Optimistic lock check if updated_at is provided (409 conflict if timestamp mismatch)
 * 4. Response validation and parsing
 *
 * @returns TanStack Query mutation hook for updating translations
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid UUID, locale format, value constraints)
 * @throws {ApiErrorResponse} 404 - Translation not found or no rows affected
 * @throws {ApiErrorResponse} 409 - Optimistic lock failure (translation was modified by another user)
 * @throws {ApiErrorResponse} 500 - Database error during update
 */
export function useUpdateTranslation() {
  const supabase = useSupabase();

  return useMutation<TranslationResponse, ApiErrorResponse, UpdateTranslationRequest>({
    mutationFn: async (payload) => {
      const {
        is_machine_translated,
        key_id,
        locale,
        project_id,
        updated_at,
        updated_by_user_id,
        updated_source,
        value,
      } = payload;

      // validate the update request body
      const body = UPDATE_TRANSLATION_REQUEST_BODY_SCHEMA.parse({
        is_machine_translated,
        updated_by_user_id,
        updated_source,
        value,
      });

      let query = supabase
        .from('translations')
        .update(body)
        .eq('project_id', project_id)
        .eq('key_id', key_id)
        .eq('locale', locale);

      // add optimistic locking if timestamp provided
      if (updated_at) {
        query = query.eq('updated_at', updated_at);
      }

      const { count, data, error } = await query.select().single();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useUpdateTranslation', 'Failed to update translation');
      }

      // handle optimistic lock failure (no rows affected)
      if (count === 0) {
        throw createApiErrorResponse(409, 'Translation was modified by another user. Please refresh and try again.');
      }

      if (!data) {
        throw createApiErrorResponse(404, 'Translation not found');
      }

      return TRANSLATION_RESPONSE_SCHEMA.parse(data);
    },
  });
}
