import { useCallback, useMemo, useState } from 'react';

import type { ApiErrorResponse } from '@/shared/types';

import { useExportTranslations } from '../../../api/useExportTranslations';
import { ExportButton } from '../../common/ExportButton';
import { ExportStatus } from '../../common/ExportStatus';

interface ExportActionsProps {
  isDisabled: boolean;
  projectId: string;
}

type ExportStatus = 'error' | 'exporting' | 'idle' | 'success';

/**
 * ExportActions - Form component managing export button and status feedback.
 *
 * Renders the export action area, including the export button and status feedback.
 * Handles the export translations mutation lifecycle, including validation, loading,
 * success, and error states. Provides user feedback and disables the export button
 * when exporting or when disabled by parent.
 *
 * @param {ExportActionsProps} props - Component props
 * @param {boolean} props.isDisabled - If true, disables the export action (e.g., no locales or permissions)
 * @param {string} props.projectId - The unique identifier of the project to export
 *
 * @returns {JSX.Element} Export button and status feedback UI
 *
 * @see {@link useExportTranslations} for the underlying export mutation
 * @see {@link ExportButton} for the export trigger button
 * @see {@link ExportStatus} for status display component
 */
export function ExportActions({ isDisabled, projectId }: ExportActionsProps) {
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [error, setError] = useState<ApiErrorResponse | null>(null);

  const exportTranslations = useExportTranslations(projectId);

  const isExporting = useMemo(() => exportStatus === 'exporting', [exportStatus]);

  const handleExport = useCallback(async () => {
    if (isDisabled || isExporting) {
      return;
    }

    setExportStatus('exporting');
    setError(null);

    try {
      await exportTranslations.mutateAsync();
      setExportStatus('success');
    } catch (catchError) {
      setError(catchError as ApiErrorResponse);
      setExportStatus('error');
    }
  }, [isDisabled, isExporting, exportTranslations]);

  const handleRetry = useCallback(() => {
    handleExport();
  }, [handleExport]);

  const isButtonDisabled = useMemo(() => isDisabled || isExporting, [isDisabled, isExporting]);

  return (
    <div className="space-y-4">
      <ExportButton disabled={isButtonDisabled} isLoading={isExporting} onClick={handleExport} />
      <ExportStatus error={error} onRetry={handleRetry} status={exportStatus} />
    </div>
  );
}
