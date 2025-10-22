import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  ApiErrorResponse,
  CancelTranslationJobContext,
  CancelTranslationJobRequest,
  TranslationJobResponse,
} from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { TRANSLATION_JOBS_ERROR_MESSAGES, TRANSLATION_JOBS_VALIDATION } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createTranslationJobDatabaseErrorResponse } from '../translation-jobs.errors';
import { TRANSLATION_JOBS_KEY_FACTORY } from '../translation-jobs.key-factory';
import { CANCEL_TRANSLATION_JOB_SCHEMA } from '../translation-jobs.schemas';

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
 *
 * @returns TanStack Query mutation hook for cancelling translation jobs
 */
export function useCancelTranslationJob() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<
    TranslationJobResponse,
    ApiErrorResponse,
    CancelTranslationJobRequest,
    CancelTranslationJobContext
  >({
    mutationFn: async ({ jobId }) => {
      const { job_id } = CANCEL_TRANSLATION_JOB_SCHEMA.parse({
        job_id: jobId,
        status: 'cancelled',
      });

      // fetch the current job to verify it exists and is in a cancellable state
      const { data: currentJob, error: fetchError } = await supabase
        .from('translation_jobs')
        .select('status')
        .eq('id', job_id)
        .maybeSingle();

      if (fetchError) {
        throw createTranslationJobDatabaseErrorResponse(fetchError, 'useCancelTranslationJob', 'Failed to fetch job');
      }

      if (!currentJob) {
        throw createApiErrorResponse(404, TRANSLATION_JOBS_ERROR_MESSAGES.JOB_NOT_FOUND);
      }

      // verify the job is in a cancellable state (pending or running)
      if (!TRANSLATION_JOBS_VALIDATION.isCancellableStatus(currentJob.status)) {
        throw createApiErrorResponse(400, TRANSLATION_JOBS_ERROR_MESSAGES.JOB_NOT_CANCELLABLE);
      }

      const { data, error } = await supabase
        .from('translation_jobs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'cancelled',
        })
        .eq('id', job_id)
        .select('*')
        .maybeSingle();

      if (error) {
        throw createTranslationJobDatabaseErrorResponse(error, 'useCancelTranslationJob', 'Failed to cancel job');
      }

      if (!data) {
        throw createApiErrorResponse(404, TRANSLATION_JOBS_ERROR_MESSAGES.JOB_NOT_FOUND);
      }

      return data;
    },
    onError: (_err, { jobId }, context) => {
      // rollback on error
      if (context?.previousJob) {
        queryClient.setQueryData(TRANSLATION_JOBS_KEY_FACTORY.active(context.previousJob.project_id), [
          context.previousJob,
        ]);
        queryClient.setQueryData(TRANSLATION_JOBS_KEY_FACTORY.detail(jobId), context.previousJob);
      }
    },
    onMutate: async ({ jobId }) => {
      // cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: TRANSLATION_JOBS_KEY_FACTORY.all });

      // get the current job from cache (assuming it's already loaded)
      const currentJobData = queryClient.getQueryData(TRANSLATION_JOBS_KEY_FACTORY.detail(jobId)) as
        | TranslationJobResponse
        | undefined;

      if (currentJobData) {
        const updatedJob = {
          ...currentJobData,
          finished_at: new Date().toISOString(),
          status: 'cancelled' as const,
        };

        // update active job cache (empty array since job is no longer active)
        queryClient.setQueryData(TRANSLATION_JOBS_KEY_FACTORY.active(currentJobData.project_id), []);

        // update specific job cache
        queryClient.setQueryData(TRANSLATION_JOBS_KEY_FACTORY.detail(jobId), updatedJob);

        return { previousJob: currentJobData };
      }

      return {};
    },
    onSuccess: (data) => {
      // update specific job cache
      queryClient.setQueryData(TRANSLATION_JOBS_KEY_FACTORY.detail(data.id), data);
      // invalidate active jobs cache (job is no longer active)
      queryClient.invalidateQueries({
        queryKey: TRANSLATION_JOBS_KEY_FACTORY.active(data.project_id),
      });
      // invalidate job list cache
      queryClient.invalidateQueries({
        queryKey: TRANSLATION_JOBS_KEY_FACTORY.lists(),
      });
    },
  });
}
