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
import { TRANSLATIONS_KEYS } from '../translations.key-factory';
import {
  BULK_UPDATE_TRANSLATION_QUERY_SCHEMA,
  TRANSLATION_RESPONSE_SCHEMA,
  UPDATE_TRANSLATION_REQUEST_SCHEMA,
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
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid IDs, empty key array, value constraints)
 * @throws {ApiErrorResponse} 403 - Project not owned by user
 * @throws {ApiErrorResponse} 500 - Database error during bulk update or no data returned
 *
 * @returns TanStack Query mutation hook for bulk translation updates
 *
 * @warning Not recommended for manual client use due to overwrite risk for multiple translations
 */
export function useBulkUpdateTranslations(params: BulkUpdateTranslationsParams) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<TranslationResponse[], ApiErrorResponse, UpdateTranslationRequest>({
    mutationFn: async (updateData) => {
      // validate query parameters
      const validatedQuery = BULK_UPDATE_TRANSLATION_QUERY_SCHEMA.parse({
        key_ids: params.keyIds,
        project_id: params.projectId,
        target_locale: params.locale,
      });

      // validate request data
      const validatedInput = UPDATE_TRANSLATION_REQUEST_SCHEMA.parse(updateData);

      const { data, error } = await supabase
        .from('translations')
        .update(validatedInput)
        .eq('project_id', validatedQuery.project_id)
        .eq('target_locale', validatedQuery.target_locale)
        .in('key_id', validatedQuery.key_ids)
        .select();

      // handle database errors
      if (error) {
        throw createDatabaseErrorResponse(error, 'useBulkUpdateTranslations', 'Failed to bulk update translations');
      }

      // handle missing data
      if (!data) {
        throw createApiErrorResponse(500, 'No data returned from server');
      }

      // runtime validation of response data
      const validatedResponse = z.array(TRANSLATION_RESPONSE_SCHEMA).parse(data);
      return validatedResponse;
    },
    onSuccess: () => {
      // invalidate per-language key view cache for the target locale
      queryClient.invalidateQueries({
        queryKey: ['keys', 'per-language', params.projectId, params.locale],
      });

      // invalidate individual translation caches for all affected keys
      params.keyIds.forEach((keyId: string) => {
        queryClient.invalidateQueries({
          queryKey: TRANSLATIONS_KEYS.detail(params.projectId, keyId, params.locale),
        });
      });
    },
  });
}
