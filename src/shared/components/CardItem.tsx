import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

interface CardItemProps {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * CardItem – Accessible card-style container for list or summary items.
 *
 * Renders a horizontally split card with user-defined content on the left and
 * optional action elements (such as buttons or menus) on the right.
 * Cards are fully responsive and feature subtle hover effects. If an `onClick`
 * handler is provided, the card is keyboard-accessible and adopts a button role;
 * otherwise, it renders as a static container. Prevents click bubbling from
 * action elements to avoid unintended card navigation.
 *
 * @param {object} props - CardItemProps component properties
 * @param {ReactNode} props.children - Main content for the card (typically details)
 * @param {ReactNode} [props.actions] - Optional actions (e.g., menu, buttons) shown on the right; clicking an action does not trigger the card's `onClick`
 * @param {string} [props.className] - Additional className(s) for card styling
 * @param {() => void} [props.onClick] - If provided, makes the card clickable (button semantics) for navigation or selection
 *
 * @example
 * <CardItem
 *   onClick={() => navigate(`/projects/${project.id}`)}
 *   actions={
 *     <DropdownMenu>
 *       <DropdownMenuItem>Edit</DropdownMenuItem>
 *       <DropdownMenuItem>Delete</DropdownMenuItem>
 *     </DropdownMenu>
 *   }
 * >
 *   <div>
 *     <h3 className="font-medium">{project.name}</h3>
 *     <p className="text-muted-foreground text-sm">{project.description}</p>
 *   </div>
 * </CardItem>
 */
export function CardItem({ actions, children, className, onClick }: CardItemProps) {
  const isClickable = Boolean(onClick);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className={cn(
        'bg-card text-card-foreground rounded-lg border px-4 py-3 shadow-sm transition-colors',
        isClickable && 'hover:bg-accent/50 cursor-pointer',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 flex-col gap-1">{children}</div>
        {actions && (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <div
            className="flex-shrink-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.stopPropagation();
              }
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
