import { DownloadIcon, Loader2Icon } from 'lucide-react';

import { Button } from '@/shared/ui/button';

interface ExportButtonProps {
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

/**
 * ExportButton - Action button for exporting translations with loading and disabled states
 *
 * Renders a large primary button to trigger the project export process. While loading,
 * displays a spinning loader icon and updates the label to "Exporting...". Otherwise,
 * shows the standard download icon and "Export Translations" label. Handles accessibility
 * with `aria-disabled` and disables interaction while an export is in progress.
 *
 * @param {Object} props - Component properties
 * @param {boolean} [props.disabled=false] - If true, button is disabled and cannot be clicked
 * @param {boolean} [props.isLoading=false] - If true, shows loading spinner and disables the button
 * @param {() => void} props.onClick - Callback invoked when the button is pressed
 *
 * @returns {JSX.Element} Export action button with loading/disabled states and icon
 */
export function ExportButton({ disabled = false, isLoading = false, onClick }: ExportButtonProps) {
  return (
    <Button aria-disabled={disabled || isLoading} disabled={disabled || isLoading} onClick={onClick} size="lg">
      {isLoading ? <Loader2Icon aria-hidden="true" className="animate-spin" /> : <DownloadIcon aria-hidden="true" />}
      {isLoading ? 'Exporting...' : 'Export Translations'}
    </Button>
  );
}
