import { AlertCircleIcon, CheckCircleIcon, InfoIcon } from 'lucide-react';

import type { ApiErrorResponse } from '@/shared/types';

import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

type ExportStatus = 'error' | 'exporting' | 'idle' | 'success';

interface ExportStatusProps {
  error: ApiErrorResponse | null;
  onRetry?: () => void;
  status: ExportStatus;
}

/**
 * ExportStatus - Shows export progress, success confirmation, or error messages with appropriate styling
 *
 * Displays different states of the export process with icons and user-friendly messages.
 * Provides retry option for failed exports.
 */
export function ExportStatus({ error, onRetry, status }: ExportStatusProps) {
  if (status === 'idle') {
    return null;
  }

  if (status === 'exporting') {
    return (
      <Alert>
        <InfoIcon aria-hidden="true" className="size-4" />
        <AlertDescription>
          Preparing your translation files for download. This may take a few moments...
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'success') {
    return (
      <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
        <CheckCircleIcon aria-hidden="true" className="size-4" />
        <AlertDescription>
          Export completed successfully! Your browser should have started the download.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'error' && error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" className="size-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>Export failed: {error.error.message}</p>
            {onRetry && (
              <Button onClick={onRetry} size="sm" variant="outline">
                Try Again
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
