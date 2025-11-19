import { useMemo } from 'react';

import type { JobStatus } from '@/shared/types';

import { Badge } from '@/shared/ui/badge';

interface JobStatusBadgeProps {
  size?: 'md' | 'sm';
  status: JobStatus;
}

/**
 * JobStatusBadge - Status indicator component with color-coded badges
 *
 * Displays job status with appropriate color coding and accessibility labels.
 * Status colors:
 * - pending: secondary (gray)
 * - running: default (blue/primary)
 * - completed: secondary with green text
 * - failed: destructive (red)
 * - cancelled: outline (muted)
 *
 * @param {JobStatusBadgeProps} props - Component props
 * @param {'md' | 'sm'} [props.size='md'] - Badge size variant
 * @param {JobStatus} props.status - The job status to display
 *
 * @returns {JSX.Element} Color-coded status badge component
 */
export function JobStatusBadge({ size = 'md', status }: JobStatusBadgeProps) {
  const variant = useMemo(() => {
    switch (status) {
      case 'cancelled':
        return 'outline';
      case 'completed':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'running':
        return 'default';
      default:
        return 'outline';
    }
  }, [status]);

  const className = useMemo(() => {
    const baseClass = size === 'sm' ? 'text-xs' : 'text-sm';
    const statusClass =
      status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : '';
    return `${baseClass} ${statusClass}`.trim();
  }, [size, status]);

  return (
    <Badge aria-label={`Status: ${status}`} className={className} variant={variant}>
      {status}
    </Badge>
  );
}
