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
import { translationsKeys } from '../translations.keys';
import {
  translationResponseSchema,
  updateTranslationQuerySchema,
  updateTranslationRequestSchema,
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
 * @throws {ApiErrorResponse} 400 - Validation error (invalid IDs, value constraints, default locale empty)
 * @throws {ApiErrorResponse} 404 - Translation not found
 * @throws {ApiErrorResponse} 409 - Optimistic lock failure (translation modified by another user)
 * @throws {ApiErrorResponse} 500 - Database error during update
 * @returns TanStack Query mutation hook for updating translations with optimistic updates
 */
export function useUpdateTranslation(params: UpdateTranslationParams) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<TranslationResponse, ApiErrorResponse, UpdateTranslationRequest, UpdateTranslationContext>({
    mutationFn: async (updateData) => {
      // Validate query parameters
      const validatedQuery = updateTranslationQuerySchema.parse({
        key_id: params.keyId,
        locale: params.locale,
        project_id: params.projectId,
        updated_at: params.updatedAt,
      });

      // Validate request data
      const validatedInput = updateTranslationRequestSchema.parse(updateData);

      // Build query with optimistic locking support
      let query = supabase
        .from('translations')
        .update(validatedInput)
        .eq('project_id', validatedQuery.project_id)
        .eq('key_id', validatedQuery.key_id)
        .eq('locale', validatedQuery.locale);

      // Add optimistic locking if timestamp provided
      if (validatedQuery.updated_at) {
        query = query.eq('updated_at', validatedQuery.updated_at);
      }

      const { count, data, error } = await query.select().single();

      // Handle database errors
      if (error) {
        throw createDatabaseErrorResponse(error, 'useUpdateTranslation', 'Failed to update translation');
      }

      // Handle optimistic lock failure (no rows affected)
      if (count === 0) {
        throw createApiErrorResponse(409, 'Translation was modified by another user. Please refresh and try again.');
      }

      // Handle missing data
      if (!data) {
        throw createApiErrorResponse(404, 'Translation not found');
      }

      // Runtime validation of response data
      const validatedResponse = translationResponseSchema.parse(data);
      return validatedResponse;
    },
    onError: (_err, _newData, context) => {
      // Rollback on error
      if (context?.previousTranslation !== undefined) {
        queryClient.setQueryData(
          translationsKeys.detail(params.projectId, params.keyId, params.locale),
          context.previousTranslation
        );
      }
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: translationsKeys.detail(params.projectId, params.keyId, params.locale),
      });

      // Snapshot previous value
      const previousTranslation = queryClient.getQueryData<null | TranslationResponse>(
        translationsKeys.detail(params.projectId, params.keyId, params.locale)
      );

      // Optimistically update
      queryClient.setQueryData(
        translationsKeys.detail(params.projectId, params.keyId, params.locale),
        (old: null | TranslationResponse) => {
          // If no previous translation, create new one with optimistic data
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
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: translationsKeys.detail(params.projectId, params.keyId, params.locale),
      });
      // Also invalidate key lists that show this translation
      queryClient.invalidateQueries({
        queryKey: ['keys', 'per-language', params.projectId, params.locale],
      });
    },
  });
}
