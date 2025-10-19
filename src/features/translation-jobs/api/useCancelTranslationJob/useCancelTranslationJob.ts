import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse, TranslationJobResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createTranslationJobDatabaseErrorResponse } from '../translation-jobs.errors';
import { translationJobsKeys } from '../translation-jobs.keys';
import { cancelTranslationJobSchema } from '../translation-jobs.schemas';

/**
 * Context type for mutation callbacks
 */
interface CancelTranslationJobContext {
  previousJob?: TranslationJobResponse;
}

/**
 * Variables for cancelling a translation job
 */
interface CancelTranslationJobVariables {
  jobId: string;
}

/**
 * Cancel running translation job
 *
 * Updates job status to 'cancelled' and sets finished_at timestamp.
 * Edge Function will check cancellation flag and stop processing between API calls.
 * Completed translations are preserved.
 *
 * Cancellation conditions:
 * - Job must be in 'pending' or 'running' status
 * - User must own the project (enforced by RLS)
 * - Database triggers validate state transitions
 *
 * After successful cancellation:
 * - Updates specific job cache with new status
 * - Invalidates active job cache (job no longer active)
 * - Invalidates job list cache to show updated status
 * - Client should stop polling active job status
 *
 * @throws {ApiErrorResponse} 400 - Job not in cancellable state (completed/failed/cancelled)
 * @throws {ApiErrorResponse} 404 - Job not found or access denied (via RLS)
 * @throws {ApiErrorResponse} 500 - Database error during update
 * @returns TanStack Query mutation hook for cancelling translation jobs
 */
export function useCancelTranslationJob() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<
    TranslationJobResponse,
    ApiErrorResponse,
    CancelTranslationJobVariables,
    CancelTranslationJobContext
  >({
    mutationFn: async ({ jobId }) => {
      // Validate input
      const validated = cancelTranslationJobSchema.parse({
        job_id: jobId,
        status: 'cancelled',
      });

      const { data, error } = await supabase
        .from('translation_jobs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'cancelled',
        })
        .eq('id', validated.job_id)
        .select('*')
        .maybeSingle();

      if (error) {
        throw createTranslationJobDatabaseErrorResponse(error, 'useCancelTranslationJob', 'Failed to cancel job');
      }

      if (!data) {
        throw createApiErrorResponse(404, 'Translation job not found or access denied');
      }

      // Return data directly - it's already the correct Supabase type
      return data;
    },
    onError: (_err, { jobId }, context) => {
      // Rollback on error
      if (context?.previousJob) {
        queryClient.setQueryData(translationJobsKeys.active(context.previousJob.project_id), [context.previousJob]);
        queryClient.setQueryData(translationJobsKeys.detail(jobId), context.previousJob);
      }
    },
    onMutate: async ({ jobId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: translationJobsKeys.all });

      // Get the current job from cache (assuming it's already loaded)
      const currentJobData = queryClient.getQueryData(translationJobsKeys.detail(jobId)) as
        | TranslationJobResponse
        | undefined;

      if (currentJobData) {
        const updatedJob = {
          ...currentJobData,
          finished_at: new Date().toISOString(),
          status: 'cancelled' as const,
        };

        // Update active job cache (empty array since job is no longer active)
        queryClient.setQueryData(translationJobsKeys.active(currentJobData.project_id), []);

        // Update specific job cache
        queryClient.setQueryData(translationJobsKeys.detail(jobId), updatedJob);

        return { previousJob: currentJobData };
      }

      return {};
    },
    onSuccess: (data) => {
      // Update specific job cache
      queryClient.setQueryData(translationJobsKeys.detail(data.id), data);
      // Invalidate active jobs cache (job is no longer active)
      queryClient.invalidateQueries({
        queryKey: translationJobsKeys.active(data.project_id),
      });
      // Invalidate job list cache
      queryClient.invalidateQueries({
        queryKey: translationJobsKeys.lists(),
      });
    },
  });
}
