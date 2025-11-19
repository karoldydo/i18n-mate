import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

interface ValidationErrorProps {
  buttonLabel: string;
  dataTestId: string;
  to: string;
}

/**
 * ValidationError - Display a standardized validation error message
 *
 * This reusable component renders a user-friendly error message when
 * critical URL parameters (such as project or locale IDs) fail validation.
 * It presents a descriptive headline, supporting text, and a customizable
 * action link to guide users back or navigate to a provided route.
 *
 * @param {Object} props - ValidationError props
 * @param {string} props.buttonLabel - Label text for the error action link
 * @param {string} props.dataTestId - Test identifier for the root div and link
 * @param {string} props.to - Route path to navigate to
 *
 * @returns {JSX.Element} The rendered validation error UI
 */
export function ValidationError({ buttonLabel, dataTestId, to }: ValidationErrorProps) {
  return (
    <div className="container" data-testid={dataTestId}>
      <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
        <h2 className="text-destructive mb-1 text-lg font-semibold">Invalid parameter</h2>
        <p className="text-muted-foreground mb-5 text-sm">
          The parameter in the URL is not valid, please go back to the previous page and try again.
        </p>
        <Link
          aria-label={buttonLabel}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
          data-testid={`${dataTestId}-button`}
          to={to}
        >
          <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Link>
      </div>
    </div>
  );
}
