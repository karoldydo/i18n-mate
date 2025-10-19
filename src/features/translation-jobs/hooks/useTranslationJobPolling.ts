import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { TRANSLATION_JOBS_POLL_INTERVALS, TRANSLATION_JOBS_POLL_MAX_ATTEMPTS } from '@/shared/constants';
import { isActiveJob, isFinishedJob } from '@/shared/types';

import { translationJobsKeys, useActiveTranslationJob } from '../api';

/**
 * Custom hook for polling active translation job with exponential backoff
 *
 * Automatically starts/stops polling based on job status.
 * Uses exponential backoff to reduce server load for long-running jobs.
 *
 * Polling strategy:
 * - Intervals: [2s, 2s, 3s, 5s, 5s] with max 180 attempts (15 minutes)
 * - Automatically stops when job finishes or no active job exists
 * - Cleans up timeouts on unmount or when polling stops
 * - Invalidates active job cache to trigger fresh data fetch
 *
 * Usage:
 * ```tsx
 * const { activeJob, isJobRunning, isPolling } = useTranslationJobPolling(projectId);
 *
 * // Show progress UI when job is running
 * if (isJobRunning) {
 *   return <JobProgressIndicator job={activeJob} />;
 * }
 * ```
 *
 * @param projectId - Project UUID to poll for active jobs
 * @param enabled - Whether polling is enabled (default: true)
 * @returns Object with active job data and polling status
 */
export function useTranslationJobPolling(projectId: string, enabled = true) {
  const queryClient = useQueryClient();
  const activeJobQuery = useActiveTranslationJob(projectId);
  const pollAttemptRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeJob = activeJobQuery.data?.[0];
  const hasActiveJob = Boolean(activeJob);
  const isJobRunning = activeJob ? isActiveJob(activeJob) : false;

  useEffect(() => {
    if (!enabled || !hasActiveJob || !isJobRunning) {
      // Clear polling if no active job or job finished
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      pollAttemptRef.current = 0;
      return;
    }

    const scheduleNextPoll = () => {
      if (pollAttemptRef.current >= TRANSLATION_JOBS_POLL_MAX_ATTEMPTS) {
        console.warn('Translation job polling max attempts reached');
        return;
      }

      const intervalIndex = Math.min(pollAttemptRef.current, TRANSLATION_JOBS_POLL_INTERVALS.length - 1);
      const interval = TRANSLATION_JOBS_POLL_INTERVALS[intervalIndex];

      timeoutRef.current = setTimeout(() => {
        pollAttemptRef.current++;
        queryClient.invalidateQueries({
          queryKey: translationJobsKeys.active(projectId),
        });
        scheduleNextPoll();
      }, interval);
    };

    scheduleNextPoll();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [projectId, enabled, hasActiveJob, isJobRunning, queryClient]);

  return {
    activeJob,
    hasActiveJob,
    isJobFinished: activeJob ? isFinishedJob(activeJob) : false,
    isJobRunning,
    isPolling: Boolean(timeoutRef.current),
    pollAttempt: pollAttemptRef.current,
  };
}
