import { useState } from 'react';

import type { ApiErrorResponse } from '@/shared/types';

import { useExportTranslations } from '../api/useExportTranslations';
import { ExportButton, ExportStatus } from './index';

interface ExportActionsProps {
  isDisabled: boolean;
  projectId: string;
}

type ExportStatus = 'error' | 'exporting' | 'idle' | 'success';

/**
 * ExportActions - Contains the export button and handles the export mutation with loading states
 *
 * Manages the export process state and provides user feedback during the export operation.
 * Disables export when no locales are available or when an export is in progress.
 */
export function ExportActions({ isDisabled, projectId }: ExportActionsProps) {
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [error, setError] = useState<ApiErrorResponse | null>(null);

  const exportTranslations = useExportTranslations(projectId);

  const handleExport = async () => {
    if (isDisabled || exportStatus === 'exporting') {
      return;
    }

    setExportStatus('exporting');
    setError(null);

    try {
      await exportTranslations.mutateAsync();
      setExportStatus('success');
    } catch (error) {
      setError(error as ApiErrorResponse);
      setExportStatus('error');
    }
  };

  const handleRetry = () => {
    handleExport();
  };

  return (
    <div className="space-y-4">
      <ExportButton
        disabled={isDisabled || exportStatus === 'exporting'}
        isLoading={exportStatus === 'exporting'}
        onClick={handleExport}
      />
      <ExportStatus error={error} onRetry={handleRetry} status={exportStatus} />
    </div>
  );
}
