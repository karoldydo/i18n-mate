import { DownloadIcon, Loader2Icon } from 'lucide-react';

import { Button } from '@/shared/ui/button';

interface ExportButtonProps {
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

/**
 * ExportButton - Reusable button component with loading state for triggering translation exports
 *
 * Displays a download icon normally, and a loading spinner when exporting.
 * Includes proper accessibility attributes and disabled state handling.
 */
export function ExportButton({ disabled = false, isLoading = false, onClick }: ExportButtonProps) {
  return (
    <Button aria-disabled={disabled || isLoading} disabled={disabled || isLoading} onClick={onClick} size="lg">
      {isLoading ? <Loader2Icon aria-hidden="true" className="animate-spin" /> : <DownloadIcon aria-hidden="true" />}
      {isLoading ? 'Exporting...' : 'Export Translations'}
    </Button>
  );
}
