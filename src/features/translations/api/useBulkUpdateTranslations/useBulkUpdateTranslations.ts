import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import type {
  ApiErrorResponse,
  BulkUpdateTranslationsParams,
  TranslationResponse,
  UpdateTranslationRequest,
} from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../translations.errors';
import { translationsKeys } from '../translations.keys';
import {
  bulkUpdateTranslationQuerySchema,
  translationResponseSchema,
  updateTranslationRequestSchema,
} from '../translations.schemas';

/**
 * Update multiple translation values in a single atomic operation
 *
 * Performs bulk update of translations for multiple keys in the same locale
 * using PostgreSQL's IN operator for efficient multi-row updates. Primarily
 * used internally by translation jobs for batch processing. All affected
 * translations receive identical update data (value, metadata). Validates
 * all constraints and triggers cache invalidation for affected views.
 *
 * @param params - Bulk update parameters and context
 * @param params.projectId - Project UUID for all translations (required)
 * @param params.keyIds - Array of translation key UUIDs to update (required, min: 1)
 * @param params.locale - Target locale code in BCP-47 format (required)
 * @throws {ApiErrorResponse} 400 - Validation error (invalid IDs, empty key array, value constraints)
 * @throws {ApiErrorResponse} 403 - Project not owned by user
 * @throws {ApiErrorResponse} 500 - Database error during bulk update or no data returned
 * @returns TanStack Query mutation hook for bulk translation updates
 * @warning Not recommended for manual client use due to overwrite risk for multiple translations
 */
export function useBulkUpdateTranslations(params: BulkUpdateTranslationsParams) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<TranslationResponse[], ApiErrorResponse, UpdateTranslationRequest>({
    mutationFn: async (updateData) => {
      // Validate query parameters
      const validatedQuery = bulkUpdateTranslationQuerySchema.parse({
        key_ids: params.keyIds,
        locale: params.locale,
        project_id: params.projectId,
      });

      // Validate request data
      const validatedInput = updateTranslationRequestSchema.parse(updateData);

      const { data, error } = await supabase
        .from('translations')
        .update(validatedInput)
        .eq('project_id', validatedQuery.project_id)
        .eq('locale', validatedQuery.locale)
        .in('key_id', validatedQuery.key_ids)
        .select();

      // Handle database errors
      if (error) {
        throw createDatabaseErrorResponse(error, 'useBulkUpdateTranslations', 'Failed to bulk update translations');
      }

      // Handle missing data
      if (!data) {
        throw createApiErrorResponse(500, 'No data returned from server');
      }

      // Runtime validation of response data
      const validatedResponse = z.array(translationResponseSchema).parse(data);
      return validatedResponse;
    },
    onSuccess: () => {
      // Invalidate per-language key view cache for the target locale
      queryClient.invalidateQueries({
        queryKey: ['keys', 'per-language', params.projectId, params.locale],
      });

      // Invalidate individual translation caches for all affected keys
      params.keyIds.forEach((keyId: string) => {
        queryClient.invalidateQueries({
          queryKey: translationsKeys.detail(params.projectId, keyId, params.locale),
        });
      });
    },
  });
}
