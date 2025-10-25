import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse, TranslationResponse, UpdateTranslationRequest } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../translations.errors';
import { TRANSLATIONS_KEYS } from '../translations.key-factory';
import { TRANSLATION_RESPONSE_SCHEMA, UPDATE_TRANSLATION_REQUEST_BODY_SCHEMA } from '../translations.schemas';

/**
 * Context type for mutation callbacks
 */
interface UpdateTranslationContext {
  previousTranslation?: null | TranslationResponse;
}

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
  const queryClient = useQueryClient();

  return useMutation<TranslationResponse, ApiErrorResponse, UpdateTranslationRequest, UpdateTranslationContext>({
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
    onError: (_err, payload, context) => {
      // rollback on error
      if (context?.previousTranslation !== undefined) {
        queryClient.setQueryData(
          TRANSLATIONS_KEYS.detail(payload.project_id, payload.key_id, payload.locale),
          context.previousTranslation
        );
      }
    },
    onMutate: async (payload) => {
      // cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: TRANSLATIONS_KEYS.detail(payload.project_id, payload.key_id, payload.locale),
      });

      // snapshot previous value
      const previousTranslation = queryClient.getQueryData<null | TranslationResponse>(
        TRANSLATIONS_KEYS.detail(payload.project_id, payload.key_id, payload.locale)
      );

      // optimistically update
      queryClient.setQueryData(
        TRANSLATIONS_KEYS.detail(payload.project_id, payload.key_id, payload.locale),
        (old: null | TranslationResponse) => {
          // if no previous translation, create new one with optimistic data
          if (!old) {
            return {
              is_machine_translated: payload.is_machine_translated,
              key_id: payload.key_id,
              locale: payload.locale,
              project_id: payload.project_id,
              updated_at: new Date().toISOString(),
              updated_by_user_id: payload.updated_by_user_id,
              updated_source: payload.updated_source,
              value: payload.value,
            } as TranslationResponse;
          }

          return {
            ...old,
            is_machine_translated: payload.is_machine_translated,
            updated_at: new Date().toISOString(),
            updated_by_user_id: payload.updated_by_user_id,
            updated_source: payload.updated_source,
            value: payload.value,
          };
        }
      );

      return { previousTranslation };
    },
    onSettled: (_data, _error, payload) => {
      // refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: TRANSLATIONS_KEYS.detail(payload.project_id, payload.key_id, payload.locale),
      });
      // invalidate key lists that show this translation
      // per-language view
      queryClient.invalidateQueries({
        queryKey: ['keys', 'per-language', payload.project_id, payload.locale],
      });
      // default view (if updating default locale)
      queryClient.invalidateQueries({
        queryKey: ['keys', 'default', payload.project_id],
      });
    },
  });
}
