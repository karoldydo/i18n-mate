import { X } from 'lucide-react';
import { useCallback } from 'react';

import type { TranslationJobResponse } from '@/shared/types';

import { CardItem } from '@/shared/components';
import { Button } from '@/shared/ui/button';

import { JobProgressIndicator } from '../../common/JobProgressIndicator';
import { JobStatusBadge } from '../../common/JobStatusBadge';

interface TranslationJobCardProps {
  job: TranslationJobResponse;
  onCancelJob?: (job: TranslationJobResponse) => void;
  onJobClick?: (job: TranslationJobResponse) => void;
}

/**
 * TranslationJobCard – Presents an individual translation job's information and actions in a card UI.
 *
 * Displays job mode, target locale, status, created time, progress, and cancel action.
 * Card click opens progress modal. Cancel button is only shown for active jobs (pending/running).
 *
 * @param {Object} props - Component props
 * @param {TranslationJobResponse} props.job - The translation job data to display
 * @param {(job: TranslationJobResponse) => void} [props.onJobClick] - Called when the card is clicked, to open progress modal
 * @param {(job: TranslationJobResponse) => void} [props.onCancelJob] - Called when the Cancel button is clicked (passes the job)
 *
 * @returns {JSX.Element} Card structure displaying job information, progress, and cancel action.
 *
 * @example
 * <TranslationJobCard
 *   job={job}
 *   onJobClick={handleJobClick}
 *   onCancelJob={handleCancelJob}
 * />
 *
 * Layout:
 * - Mode (capitalized, e.g., "all", "selected", "single")
 * - Target locale (BCP-47 format)
 * - Status badge (color-coded)
 * - Created time (formatted)
 * - Progress indicator with completion stats
 * - Cancel button (only for active jobs)
 */
export function TranslationJobCard({ job, onCancelJob, onJobClick }: TranslationJobCardProps) {
  const isActive = job.status === 'pending' || job.status === 'running';
  const isClickable = Boolean(onJobClick);

  const handleClick = useCallback(() => {
    if (onJobClick) {
      onJobClick(job);
    }
  }, [onJobClick, job]);

  const handleCancelClick = useCallback(() => {
    if (onCancelJob) {
      onCancelJob(job);
    }
  }, [onCancelJob, job]);

  return (
    <CardItem
      actions={
        isActive && onCancelJob ? (
          <Button
            aria-label={`Cancel translation job for ${job.target_locale}`}
            onClick={handleCancelClick}
            size="sm"
            variant="ghost"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        ) : undefined
      }
      onClick={isClickable ? handleClick : undefined}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* mode and status */}
        <div className="flex items-center gap-3">
          <h3 className="font-semibold capitalize" data-testid={`job-mode-${job.id}`}>
            {job.mode}
          </h3>
        </div>

        {/* target locale */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Target locale</span>
          <code className="bg-muted rounded px-2 py-0.5 font-mono font-medium" data-testid={`job-locale-${job.id}`}>
            {job.target_locale}
          </code>
        </div>

        {/* created time */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Created</span>
          <time className="text-muted-foreground" data-testid={`job-created-${job.id}`} dateTime={job.created_at}>
            {new Date(job.created_at).toLocaleString()}
          </time>
        </div>

        {/* progress indicator */}
        <div className="flex items-center gap-3 sm:min-w-xs" data-testid={`job-progress-${job.id}`}>
          <JobStatusBadge data-testid={`job-status-${job.id}`} status={job.status} />
          <div className="min-w-0 flex-1">
            <JobProgressIndicator job={job} showDetails={true} />
          </div>
        </div>
      </div>
    </CardItem>
  );
}
