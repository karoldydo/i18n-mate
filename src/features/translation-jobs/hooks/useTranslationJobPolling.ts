import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

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
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeJob = activeJobQuery.data?.[0];
  const hasActiveJob = Boolean(activeJob);
  const isJobRunning = activeJob ? isActiveJob(activeJob) : false;

  // Memoized cleanup function to prevent recreation on every render
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    pollAttemptRef.current = 0;
  }, []);

  // Memoized poll function to prevent recreation
  const scheduleNextPoll = useCallback(() => {
    if (pollAttemptRef.current >= TRANSLATION_JOBS_POLL_MAX_ATTEMPTS) {
      console.warn('Translation job polling max attempts reached');
      cleanup();
      return;
    }

    const intervalIndex = Math.min(pollAttemptRef.current, TRANSLATION_JOBS_POLL_INTERVALS.length - 1);
    const interval = TRANSLATION_JOBS_POLL_INTERVALS[intervalIndex];

    timeoutRef.current = setTimeout(() => {
      // Check if polling was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      pollAttemptRef.current++;
      queryClient.invalidateQueries({
        queryKey: translationJobsKeys.active(projectId),
      });
      scheduleNextPoll();
    }, interval);
  }, [cleanup, projectId, queryClient]);

  useEffect(() => {
    // Early return if polling should not be active
    if (!enabled || !hasActiveJob || !isJobRunning) {
      cleanup();
      return;
    }

    // Create new abort controller for this polling session
    abortControllerRef.current = new AbortController();

    scheduleNextPoll();

    // Cleanup function for effect
    return cleanup;
  }, [projectId, enabled, hasActiveJob, isJobRunning, scheduleNextPoll, cleanup]);

  // Manual control functions
  const stopPolling = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const startPolling = useCallback(() => {
    if (enabled && hasActiveJob && isJobRunning) {
      pollAttemptRef.current = 0;
      abortControllerRef.current = new AbortController();
      scheduleNextPoll();
    }
  }, [enabled, hasActiveJob, isJobRunning, scheduleNextPoll]);

  return {
    activeJob,
    hasActiveJob,
    isJobFinished: activeJob ? isFinishedJob(activeJob) : false,
    isJobRunning,
    isPolling: Boolean(timeoutRef.current),
    pollAttempt: pollAttemptRef.current,
    // Manual control functions
    startPolling,
    stopPolling,
  };
}
