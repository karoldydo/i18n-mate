import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  ApiErrorResponse,
  TranslationResponse,
  UpdateTranslationParams,
  UpdateTranslationRequest,
} from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../translations.errors';
import { TRANSLATIONS_KEYS } from '../translations.key-factory';
import {
  TRANSLATION_RESPONSE_SCHEMA,
  UPDATE_TRANSLATION_QUERY_SCHEMA,
  UPDATE_TRANSLATION_REQUEST_SCHEMA,
} from '../translations.schemas';

/**
 * Context type for mutation callbacks
 */
interface UpdateTranslationContext {
  previousTranslation?: null | TranslationResponse;
}

/**
 * Update a translation value with optimistic locking and optimistic UI updates
 *
 * Updates a single translation record using direct table access with composite
 * primary key matching and optional optimistic locking via updated_at timestamp.
 * Implements optimistic updates for instant UI feedback and proper rollback
 * on error. Validates translation value constraints and prevents empty values
 * for default locale. Triggers cache invalidation for affected views.
 *
 * @param params - Update parameters and context
 * @param params.projectId - Project UUID for the translation (required)
 * @param params.keyId - Translation key UUID (required)
 * @param params.locale - Target locale code in BCP-47 format (required)
 * @param params.updatedAt - ISO 8601 timestamp for optimistic locking (optional)
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid IDs, value constraints, default locale empty)
 * @throws {ApiErrorResponse} 404 - Translation not found
 * @throws {ApiErrorResponse} 409 - Optimistic lock failure (translation modified by another user)
 * @throws {ApiErrorResponse} 500 - Database error during update
 *
 * @returns TanStack Query mutation hook for updating translations with optimistic updates
 */
export function useUpdateTranslation(params: UpdateTranslationParams) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<TranslationResponse, ApiErrorResponse, UpdateTranslationRequest, UpdateTranslationContext>({
    mutationFn: async (updateData) => {
      // validate query parameters
      const validatedQuery = UPDATE_TRANSLATION_QUERY_SCHEMA.parse({
        key_id: params.keyId,
        locale: params.locale,
        project_id: params.projectId,
        updated_at: params.updatedAt,
      });

      // validate request data
      const validatedInput = UPDATE_TRANSLATION_REQUEST_SCHEMA.parse(updateData);

      // build query with optimistic locking support
      let query = supabase
        .from('translations')
        .update(validatedInput)
        .eq('project_id', validatedQuery.project_id)
        .eq('key_id', validatedQuery.key_id)
        .eq('locale', validatedQuery.locale);

      // add optimistic locking if timestamp provided
      if (validatedQuery.updated_at) {
        query = query.eq('updated_at', validatedQuery.updated_at);
      }

      const { count, data, error } = await query.select().single();

      // handle database errors
      if (error) {
        throw createDatabaseErrorResponse(error, 'useUpdateTranslation', 'Failed to update translation');
      }

      // handle optimistic lock failure (no rows affected)
      if (count === 0) {
        throw createApiErrorResponse(409, 'Translation was modified by another user. Please refresh and try again.');
      }

      // handle missing data
      if (!data) {
        throw createApiErrorResponse(404, 'Translation not found');
      }

      // runtime validation of response data
      return TRANSLATION_RESPONSE_SCHEMA.parse(data);
    },
    onError: (_err, _newData, context) => {
      // rollback on error
      if (context?.previousTranslation !== undefined) {
        queryClient.setQueryData(
          TRANSLATIONS_KEYS.detail(params.projectId, params.keyId, params.locale),
          context.previousTranslation
        );
      }
    },
    onMutate: async (newData) => {
      // cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: TRANSLATIONS_KEYS.detail(params.projectId, params.keyId, params.locale),
      });

      // snapshot previous value
      const previousTranslation = queryClient.getQueryData<null | TranslationResponse>(
        TRANSLATIONS_KEYS.detail(params.projectId, params.keyId, params.locale)
      );

      // optimistically update
      queryClient.setQueryData(
        TRANSLATIONS_KEYS.detail(params.projectId, params.keyId, params.locale),
        (old: null | TranslationResponse) => {
          // if no previous translation, create new one with optimistic data
          if (!old) {
            return {
              key_id: params.keyId,
              locale: params.locale,
              project_id: params.projectId,
              updated_at: new Date().toISOString(),
              ...newData,
            } as TranslationResponse;
          }

          return {
            ...old,
            ...newData,
            updated_at: new Date().toISOString(),
          };
        }
      );

      return { previousTranslation };
    },
    onSettled: () => {
      // refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: TRANSLATIONS_KEYS.detail(params.projectId, params.keyId, params.locale),
      });
      // also invalidate key lists that show this translation
      queryClient.invalidateQueries({
        queryKey: ['keys', 'per-language', params.projectId, params.locale],
      });
    },
  });
}
