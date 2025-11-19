import type { ReactElement, ReactNode } from 'react';

import { Inbox } from 'lucide-react';

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty';

interface EmptyStateProps {
  actions?: ReactElement;
  description: string;
  header: string;
  icon?: ReactNode;
}

/**
 * EmptyState – Generic, reusable empty state component.
 *
 * Displays an empty state with an icon, header text, description, and optional action buttons.
 * Used throughout the application to indicate empty states (e.g., no items, no results).
 *
 * @param {EmptyStateProps} props - Component props
 * @param {string} props.header - The main heading text to display
 * @param {string} props.description - The description text explaining the empty state
 * @param {ReactElement} [props.actions] - Optional action buttons or links to display below the description
 * @param {ReactNode} [props.icon] - Optional custom icon to display. Defaults to Inbox icon
 *
 * @returns {JSX.Element} The rendered empty state with icon, header, description, and optional actions
 */
export function EmptyState({ actions, description, header, icon }: EmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon || <Inbox />}</EmptyMedia>
        <EmptyTitle>{header}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {actions && <div className="mt-4">{actions}</div>}
    </Empty>
  );
}
