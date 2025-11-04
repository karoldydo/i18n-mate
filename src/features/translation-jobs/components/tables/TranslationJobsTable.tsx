import { useCallback } from 'react';

import type { TranslationJobResponse } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

import { JobProgressIndicator } from '../common/JobProgressIndicator';
import { JobStatusBadge } from '../common/JobStatusBadge';

interface TranslationJobsTableProps {
  isLoading: boolean;
  jobs: TranslationJobResponse[];
  onCancelJob?: (job: TranslationJobResponse) => void;
  onJobClick?: (job: TranslationJobResponse) => void;
}

/**
 * TranslationJobsTable - Data table displaying translation jobs
 *
 * Renders a table with columns for mode, target locale, status, created time, and progress.
 * Supports inline actions for cancelling running jobs.
 * Rows are clickable for active jobs to open progress modal.
 */
export function TranslationJobsTable({ isLoading, jobs, onCancelJob, onJobClick }: TranslationJobsTableProps) {
  const handleRowClick = useCallback(
    (job: TranslationJobResponse) => {
      if (onJobClick) {
        onJobClick(job);
      }
    },
    [onJobClick]
  );

  const handleRowKeyDown = useCallback(
    (keyboardEvent: React.KeyboardEvent<HTMLTableRowElement>, job: TranslationJobResponse) => {
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        keyboardEvent.preventDefault();
        if (onJobClick) {
          onJobClick(job);
        }
      }
    },
    [onJobClick]
  );

  const handleCancelClick = useCallback(
    (mouseEvent: React.MouseEvent<HTMLButtonElement>, job: TranslationJobResponse) => {
      mouseEvent.stopPropagation();
      if (onCancelJob) {
        onCancelJob(job);
      }
    },
    [onCancelJob]
  );

  if (!isLoading && jobs.length === 0) {
    return (
      <div className="border-border rounded-lg border p-12 text-center">
        <p className="text-muted-foreground text-lg">No translation jobs found</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Translation jobs will appear here after you create translations using the LLM translator.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table aria-label="Translation jobs table">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[15%] min-w-[100px]" scope="col">
              Mode
            </TableHead>
            <TableHead className="w-[15%] min-w-[120px]" scope="col">
              Target Locale
            </TableHead>
            <TableHead className="w-[15%] min-w-[100px]" scope="col">
              Status
            </TableHead>
            <TableHead className="w-[20%] min-w-[180px]" scope="col">
              Created
            </TableHead>
            <TableHead className="w-[25%] min-w-[200px]" scope="col">
              Progress
            </TableHead>
            <TableHead className="w-[10%] min-w-[100px] text-right" scope="col">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const isActive = job.status === 'pending' || job.status === 'running';
            const isClickable = Boolean(onJobClick);
            const completedCount = job.completed_keys ?? 0;
            const totalCount = job.total_keys ?? 0;
            const rowAriaLabel = `Translation job for ${job.target_locale}, ${job.status}, ${completedCount} of ${totalCount} keys translated`;

            return (
              <TableRow
                aria-label={rowAriaLabel}
                className={isClickable ? 'hover:bg-muted/50 cursor-pointer' : ''}
                key={job.id}
                onClick={isClickable ? () => handleRowClick(job) : undefined}
                onKeyDown={isClickable ? (keyboardEvent) => handleRowKeyDown(keyboardEvent, job) : undefined}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
              >
                <TableCell className="font-medium capitalize">{job.mode}</TableCell>
                <TableCell>{job.target_locale}</TableCell>
                <TableCell>
                  <JobStatusBadge status={job.status} />
                </TableCell>
                <TableCell>
                  <time className="text-muted-foreground text-sm" dateTime={job.created_at}>
                    {new Date(job.created_at).toLocaleString()}
                  </time>
                </TableCell>
                <TableCell>
                  <JobProgressIndicator job={job} showDetails={true} />
                </TableCell>
                <TableCell className="text-right">
                  {isActive && onCancelJob && (
                    <Button
                      aria-label={`Cancel translation job for ${job.target_locale}`}
                      onClick={(mouseEvent) => handleCancelClick(mouseEvent, job)}
                      size="sm"
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
