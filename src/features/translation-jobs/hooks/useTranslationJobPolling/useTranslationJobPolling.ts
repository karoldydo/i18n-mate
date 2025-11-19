import { useCallback, useEffect, useRef } from 'react';

import { TRANSLATION_JOBS_POLL_INTERVALS, TRANSLATION_JOBS_POLL_MAX_ATTEMPTS } from '@/shared/constants';
import { isActiveJob, isFinishedJob } from '@/shared/types';

import { useActiveTranslationJob } from '../../api/useActiveTranslationJob';

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
 * @param {string} projectId - Project UUID to poll for active jobs
 * @param {boolean} [enabled=true] - Whether polling is enabled
 *
 * @returns {Object} Object with active job data and polling status
 * @returns {TranslationJobResponse | undefined} returns.activeJob - The active translation job, if any
 * @returns {boolean} returns.hasActiveJob - Whether an active job exists
 * @returns {boolean} returns.isJobFinished - Whether the active job has finished
 * @returns {boolean} returns.isJobRunning - Whether the active job is currently running
 * @returns {boolean} returns.isPolling - Whether polling is currently active
 * @returns {number} returns.pollAttempt - Current poll attempt number
 * @returns {() => void} returns.startPolling - Function to manually start polling
 * @returns {() => void} returns.stopPolling - Function to manually stop polling
 */
export function useTranslationJobPolling(projectId: string, enabled = true) {
  const activeJobQuery = useActiveTranslationJob(projectId);
  const pollAttemptRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeJob = activeJobQuery.data?.[0];
  const hasActiveJob = Boolean(activeJob);
  const isJobRunning = activeJob ? isActiveJob(activeJob) : false;

  // effect for managing polling lifecycle
  useEffect(() => {
    // cleanup function - defined inside effect to avoid dependency issues
    const cleanup = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      pollAttemptRef.current = 0;
    };

    // schedule next poll - defined inside effect to avoid dependency issues
    const scheduleNextPoll = () => {
      if (pollAttemptRef.current >= TRANSLATION_JOBS_POLL_MAX_ATTEMPTS) {
        console.warn('Translation job polling max attempts reached');
        cleanup();
        return;
      }

      const intervalIndex = Math.min(pollAttemptRef.current, TRANSLATION_JOBS_POLL_INTERVALS.length - 1);
      const interval = TRANSLATION_JOBS_POLL_INTERVALS[intervalIndex];

      timeoutRef.current = setTimeout(() => {
        pollAttemptRef.current++;
        activeJobQuery.refetch();
        scheduleNextPoll();
      }, interval);
    };

    // early return if polling should not be active
    if (!enabled || !hasActiveJob || !isJobRunning) {
      cleanup();
      return;
    }

    scheduleNextPoll();

    // cleanup function for effect
    return cleanup;
  }, [projectId, enabled, hasActiveJob, isJobRunning, activeJobQuery]);

  // manual control functions
  const stopPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pollAttemptRef.current = 0;
  }, []);

  const startPolling = useCallback(() => {
    if (!enabled || !hasActiveJob || !isJobRunning) {
      return;
    }

    // stop any existing polling first
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // reset and start fresh
    pollAttemptRef.current = 0;

    // trigger immediate refetch
    activeJobQuery.refetch();
  }, [enabled, hasActiveJob, isJobRunning, activeJobQuery]);

  return {
    activeJob,
    hasActiveJob,
    isJobFinished: activeJob ? isFinishedJob(activeJob) : false,
    isJobRunning,
    isPolling: Boolean(timeoutRef.current),
    pollAttempt: pollAttemptRef.current,
    // manual control functions
    startPolling,
    stopPolling,
  };
}
