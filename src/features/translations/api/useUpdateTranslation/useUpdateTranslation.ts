import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse, TranslationResponse, UpdateTranslationRequest } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../translations.errors';
import { TRANSLATION_RESPONSE_SCHEMA, UPDATE_TRANSLATION_REQUEST_BODY_SCHEMA } from '../translations.schemas';

/**
 * Update a translation value with all parameters in payload
 *
 * Accepts all parameters (projectId, keyId, locale) in the mutation payload
 * instead of hook initialization. This allows updating different translations
 * without recreating the hook.
 *
 * @returns TanStack Query mutation hook for updating translations
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
