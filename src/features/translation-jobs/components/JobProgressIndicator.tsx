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
 */
export function JobProgressIndicator({ job, showDetails = true }: JobProgressIndicatorProps) {
  const { completed_keys, failed_keys, status, total_keys } = job;

  // calculate progress percentage (0-100)
  const completedCount = completed_keys ?? 0;
  const failedCount = failed_keys ?? 0;
  const totalCount = total_keys ?? 0;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // clamp to 0-100 range for safety
  const safeProgress = Math.max(0, Math.min(100, progressPercentage));

  // determine progress bar color based on status
  const getProgressColor = () => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'failed') return 'bg-destructive';
    if (status === 'cancelled') return 'bg-muted';
    return undefined; // default color
  };

  return (
    <div className="space-y-2">
      <Progress
        aria-label={`Translation progress: ${safeProgress}%`}
        className={`h-2 ${getProgressColor()}`}
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
