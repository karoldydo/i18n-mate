import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

interface BackButtonProps {
  ariaLabel: string;
  buttonLabel: string;
  dataTestId?: string;
  to: string;
}

/**
 * BackButton - Reusable back navigation link component
 *
 * Provides a consistent back button UI with arrow icon and customizable label.
 * Used throughout the application for navigation back to previous pages.
 *
 * @param {Object} props - Component props
 * @param {string} props.ariaLabel - Accessible label for screen readers
 * @param {string} props.buttonLabel - Visible text on the link
 * @param {string} [props.dataTestId] - Optional test ID for e2e tests
 * @param {string} props.to - Route path to navigate to
 *
 * @returns {JSX.Element} Back link with arrow icon
 */
export function BackButton({ ariaLabel, buttonLabel, dataTestId, to }: BackButtonProps) {
  return (
    <Link
      aria-label={ariaLabel}
      className="hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
      data-testid={dataTestId}
      to={to}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {buttonLabel}
    </Link>
  );
}
