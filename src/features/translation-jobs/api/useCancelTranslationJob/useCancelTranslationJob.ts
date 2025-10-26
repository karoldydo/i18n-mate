import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse, CancelTranslationJobRequest, TranslationJobResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { TRANSLATION_JOBS_ERROR_MESSAGES, TRANSLATION_JOBS_VALIDATION } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createTranslationJobDatabaseErrorResponse } from '../translation-jobs.errors';
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

  return useMutation<TranslationJobResponse, ApiErrorResponse, CancelTranslationJobRequest>({
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
  });
}
