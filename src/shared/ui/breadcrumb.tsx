import { Slot } from '@radix-ui/react-slot';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/utils';

/**
 * Breadcrumb component for navigation hierarchy display.
 * Provides accessible breadcrumb navigation structure.
 *
 * @param {React.ComponentProps<'nav'>} props - Standard nav element props
 *
 * @returns {React.ReactElement} A nav element with breadcrumb aria-label
 */
function Breadcrumb({ ...props }: React.ComponentProps<'nav'>) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

/**
 * BreadcrumbEllipsis component for indicating truncated breadcrumb items.
 * Displays a more horizontal icon to indicate additional items.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'span'>} props - Standard span element props
 *
 * @returns {React.ReactElement} A span element with ellipsis icon
 */
function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex size-9 items-center justify-center', className)}
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
    </span>
  );
}

/**
 * BreadcrumbItem component for individual breadcrumb items.
 * Wraps breadcrumb links and separators in a list item.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'li'>} props - Standard li element props
 *
 * @returns {React.ReactElement} A li element styled for breadcrumb items
 */
function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li className={cn('inline-flex items-center gap-1.5', className)} data-slot="breadcrumb-item" {...props} />;
}

/**
 * BreadcrumbLink component for clickable breadcrumb navigation links.
 * Supports polymorphic rendering via the asChild prop using Radix UI Slot.
 *
 * @param {boolean} [asChild] - When true, renders as a child component instead of an anchor element
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'a'>} props - Standard anchor element props
 *
 * @returns {React.ReactElement} An anchor element or child component with breadcrumb link styling
 */
function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<'a'> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : 'a';

  return (
    <Comp className={cn('hover:text-foreground transition-colors', className)} data-slot="breadcrumb-link" {...props} />
  );
}

/**
 * BreadcrumbList component for the ordered list of breadcrumb items.
 * Provides responsive spacing and text wrapping for breadcrumb navigation.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'ol'>} props - Standard ol element props
 *
 * @returns {React.ReactElement} An ol element styled for breadcrumb lists
 */
function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      className={cn(
        'text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5',
        className
      )}
      data-slot="breadcrumb-list"
      {...props}
    />
  );
}

/**
 * BreadcrumbPage component for the current page indicator.
 * Represents the final breadcrumb item indicating the current page.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'span'>} props - Standard span element props
 *
 * @returns {React.ReactElement} A span element styled for the current breadcrumb page
 */
function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-current="page"
      aria-disabled="true"
      className={cn('text-foreground font-normal', className)}
      data-slot="breadcrumb-page"
      role="link"
      {...props}
    />
  );
}

/**
 * BreadcrumbSeparator component for separating breadcrumb items.
 * Displays a chevron right icon by default, but can be customized with children.
 *
 * @param {React.ReactNode} [children] - Custom separator content, defaults to ChevronRight icon
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'li'>} props - Standard li element props
 *
 * @returns {React.ReactElement} A li element with separator icon
 */
function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      aria-hidden="true"
      className={cn('[&>svg]:size-3.5', className)}
      data-slot="breadcrumb-separator"
      role="presentation"
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
