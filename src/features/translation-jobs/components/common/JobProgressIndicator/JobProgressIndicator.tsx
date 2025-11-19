import { useMemo } from 'react';

import type { TranslationJobResponse } from '@/shared/types';

import { Progress } from '@/shared/ui/progress';

interface JobProgressIndicatorProps {
  job: TranslationJobResponse;
  showDetails?: boolean;
}

/**
 * JobProgressIndicator - Visual progress component showing translation completion status
 *
 * Displays a progress bar with completion statistics.
 * Progress is calculated as (translated_count / total_keys) * 100.
 * Shows detailed counts when showDetails is true.
 *
 * @param {JobProgressIndicatorProps} props - Component props
 * @param {TranslationJobResponse} props.job - The translation job data to display progress for
 * @param {boolean} [props.showDetails=true] - Whether to show detailed completion statistics
 *
 * @returns {JSX.Element} Progress bar component with optional detailed statistics
 */
export function JobProgressIndicator({ job, showDetails = true }: JobProgressIndicatorProps) {
  const { completed_keys, failed_keys, status, total_keys } = job;

  const { completedCount, failedCount, totalCount } = useMemo(
    () => ({
      completedCount: completed_keys ?? 0,
      failedCount: failed_keys ?? 0,
      totalCount: total_keys ?? 0,
    }),
    [completed_keys, failed_keys, total_keys]
  );

  const safeProgress = useMemo(() => {
    const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return Math.max(0, Math.min(100, progressPercentage));
  }, [completedCount, totalCount]);

  const progressColor = useMemo(() => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'failed') return 'bg-destructive';
    if (status === 'cancelled') return 'bg-muted';
    return undefined;
  }, [status]);

  return (
    <div className="space-y-2">
      <Progress
        aria-label={`Translation progress: ${safeProgress}%`}
        className={`h-2 ${progressColor}`}
        value={safeProgress}
      />
      {showDetails && (
        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <span>
            {completedCount}/{totalCount} translated
          </span>
          {failedCount > 0 && <span className="text-destructive">{failedCount} failed</span>}
          {status === 'running' && <span className="text-primary animate-pulse">In progress...</span>}
        </div>
      )}
    </div>
  );
}
