import type { TranslationJobResponse } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

import { JobProgressIndicator } from './JobProgressIndicator';
import { JobStatusBadge } from './JobStatusBadge';

interface JobProgressModalProps {
  isOpen: boolean;
  job: null | TranslationJobResponse;
  onCancelJob?: (job: TranslationJobResponse) => void;
  onOpenChange: (open: boolean) => void;
}

/**
 * JobProgressModal - Modal dialog for monitoring active translation job progress
 *
 * Displays real-time progress updates with statistics and action buttons.
 * Auto-opens when active job is detected, auto-closes when job finishes.
 * Supports cancelling jobs mid-process.
 */
export function JobProgressModal({ isOpen, job, onCancelJob, onOpenChange }: JobProgressModalProps) {
  if (!job) {
    return null;
  }

  const canCancel = job.status === 'pending' || job.status === 'running';

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Translation Job Progress</DialogTitle>
          <DialogDescription>Monitoring translation job for {job.target_locale}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Job Info */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Mode</p>
              <p className="text-muted-foreground text-sm capitalize">{job.mode}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Status</p>
              <JobStatusBadge size="sm" status={job.status} />
            </div>
          </div>

          {/* Progress Bar and Stats */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Progress</p>
            <JobProgressIndicator job={job} showDetails={true} />
          </div>

          {/* Additional Stats */}
          <div className="border-border rounded-lg border p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-muted-foreground text-xs">Total</p>
                <p className="text-lg font-semibold">{job.total_keys ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Completed</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">{job.completed_keys ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Failed</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">{job.failed_keys ?? 0}</p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Started: {new Date(job.created_at).toLocaleString()}</p>
            {job.finished_at && (
              <p className="text-muted-foreground text-xs">Finished: {new Date(job.finished_at).toLocaleString()}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          {canCancel && onCancelJob && (
            <Button onClick={() => onCancelJob(job)} variant="destructive">
              Cancel Job
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
