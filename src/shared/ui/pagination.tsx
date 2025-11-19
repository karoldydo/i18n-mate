import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';
import * as React from 'react';

import { Button, buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/utils/index';

/**
 * Pagination link component props type.
 * Extends anchor element props with button size and active state.
 */
type PaginationLinkProps = Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'a'> & {
    children?: React.ReactNode;
    isActive?: boolean;
  };

/**
 * Pagination component for navigation between pages.
 * Provides accessible pagination navigation structure.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'nav'>} props - Standard nav element props
 *
 * @returns {React.ReactElement} A nav element with pagination aria-label and role
 */
function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      aria-label="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      data-slot="pagination"
      role="navigation"
      {...props}
    />
  );
}

/**
 * PaginationContent component for the pagination items container.
 * Provides horizontal layout for pagination controls.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'ul'>} props - Standard ul element props
 *
 * @returns {React.ReactElement} A ul element styled for pagination content
 */
function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul className={cn('flex flex-row items-center gap-1', className)} data-slot="pagination-content" {...props} />;
}

/**
 * PaginationEllipsis component for indicating truncated pagination items.
 * Displays a more horizontal icon to indicate additional pages.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'span'>} props - Standard span element props
 *
 * @returns {React.ReactElement} A span element with ellipsis icon
 */
function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      className={cn('flex size-9 items-center justify-center', className)}
      data-slot="pagination-ellipsis"
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

/**
 * PaginationItem component for individual pagination items.
 * Wraps pagination links in a list item.
 *
 * @param {React.ComponentProps<'li'>} props - Standard li element props
 *
 * @returns {React.ReactElement} A li element for pagination items
 */
function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

/**
 * PaginationLink component for clickable pagination page links.
 * Styled as a button with active state indication.
 *
 * @param {React.ReactNode} [children] - Link content
 * @param {string} [className] - Additional CSS classes to apply
 * @param {boolean} [isActive] - Whether this link represents the current page
 * @param {'default' | 'icon' | 'icon-lg' | 'icon-sm' | 'lg' | 'sm'} [size='icon'] - Size variant of the link button
 * @param {PaginationLinkProps} props - Pagination link props
 *
 * @returns {React.ReactElement} An anchor element styled as a pagination link button
 */
function PaginationLink({ children, className, isActive, size = 'icon', ...props }: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        buttonVariants({
          size,
          variant: isActive ? 'outline' : 'ghost',
        }),
        className
      )}
      data-active={isActive}
      data-slot="pagination-link"
      {...props}
    >
      {children}
    </a>
  );
}

/**
 * PaginationNext component for navigating to the next page.
 * Displays "Next" text on larger screens and a chevron right icon.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof PaginationLink>} props - Pagination link props
 *
 * @returns {React.ReactElement} A pagination link styled for next page navigation
 */
function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      size="default"
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  );
}

/**
 * PaginationPrevious component for navigating to the previous page.
 * Displays "Previous" text on larger screens and a chevron left icon.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof PaginationLink>} props - Pagination link props
 *
 * @returns {React.ReactElement} A pagination link styled for previous page navigation
 */
function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      size="default"
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
