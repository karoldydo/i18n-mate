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
 */
export function JobStatusBadge({ size = 'md', status }: JobStatusBadgeProps) {
  const getVariant = () => {
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
  };

  const getClassName = () => {
    const baseClass = size === 'sm' ? 'text-xs' : 'text-sm';
    const statusClass =
      status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : '';
    return `${baseClass} ${statusClass}`.trim();
  };

  return (
    <Badge aria-label={`Status: ${status}`} className={getClassName()} variant={getVariant()}>
      {status}
    </Badge>
  );
}
