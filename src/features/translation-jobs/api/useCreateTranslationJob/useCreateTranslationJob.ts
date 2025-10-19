import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse, CreateTranslationJobRequest, CreateTranslationJobResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createEdgeFunctionErrorResponse } from '../translation-jobs.errors';
import { translationJobsKeys } from '../translation-jobs.keys';
import { createTranslationJobResponseSchema, createTranslationJobSchema } from '../translation-jobs.schemas';

/**
 * Create new translation job via Edge Function
 *
 * Calls the /functions/v1/translate Edge Function which handles:
 * - Server-side validation and business logic
 * - Job and job items creation
 * - Asynchronous LLM translation processing
 * - Returns 202 immediately while processing continues in background
 *
 * The Edge Function performs comprehensive validation including:
 * - Project ownership verification
 * - Target locale existence and uniqueness (not default locale)
 * - Active job conflict prevention (409 if another job is running)
 * - Mode-specific key_ids validation (all/selected/single)
 * - LLM parameter validation
 *
 * After successful creation, the mutation:
 * - Invalidates active job cache to trigger polling
 * - Invalidates job list cache to show new job
 * - Client should begin polling active job status
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid params, mode/key_ids mismatch)
 * @throws {ApiErrorResponse} 409 - Conflict error (active job exists, locale is default)
 * @throws {ApiErrorResponse} 429 - Rate limit exceeded
 * @throws {ApiErrorResponse} 500 - Edge Function error, OpenRouter API error
 * @returns TanStack Query mutation hook for creating translation jobs
 */
export function useCreateTranslationJob() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<CreateTranslationJobResponse, ApiErrorResponse, CreateTranslationJobRequest>({
    mutationFn: async (jobData) => {
      // Validate input with mode-specific rules
      const validated = createTranslationJobSchema.parse(jobData);

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('translate', {
        body: validated,
      });

      if (error) {
        throw createEdgeFunctionErrorResponse(
          error.message || 'Translation service error',
          error.status || 500,
          'useCreateTranslationJob'
        );
      }

      // Runtime validation of response data
      const validatedResponse = createTranslationJobResponseSchema.parse(data);
      return validatedResponse;
    },
    onSuccess: (_, variables) => {
      // Invalidate active job cache for polling to start
      queryClient.invalidateQueries({
        queryKey: translationJobsKeys.active(variables.project_id),
      });
      // Invalidate job list cache
      queryClient.invalidateQueries({
        queryKey: translationJobsKeys.lists(),
      });
    },
  });
}
