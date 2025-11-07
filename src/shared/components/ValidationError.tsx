import { ArrowLeft } from 'lucide-react';

import { Button } from '@/shared/ui/button';

interface ValidationErrorProps {
  buttonLabel: string;
  dataTestId: string;
  onClick: () => void;
}

/**
 * ValidationError - Display a standardized validation error message
 *
 * This reusable component renders a user-friendly error message when
 * critical URL parameters (such as project or locale IDs) fail validation.
 * It presents a descriptive headline, supporting text, and a customizable
 * action button to guide users back or trigger a provided fallback.
 *
 * @param {Object} props - ValidationError props
 * @param {string} props.buttonLabel - Label text for the error action button
 * @param {string} props.dataTestId - Test identifier for the root div and button
 * @param {() => void} props.onClick - Handler called when the button is clicked
 *
 * @returns {JSX.Element} The rendered validation error UI
 */
export function ValidationError({ buttonLabel, dataTestId, onClick }: ValidationErrorProps) {
  return (
    <div className="container" data-testid={dataTestId}>
      <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
        <h2 className="text-destructive mb-1 text-lg font-semibold">Invalid parameter</h2>
        <p className="text-muted-foreground mb-5 text-sm">
          The parameter in the URL is not valid, please go back to the previous page and try again.
        </p>
        <Button data-testid={`${dataTestId}-button`} onClick={onClick} variant="destructive">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
