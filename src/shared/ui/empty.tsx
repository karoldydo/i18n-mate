import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/utils/index';

/**
 * Empty component for displaying empty states.
 * Provides a centered container for empty state content with dashed border styling.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element styled for empty states
 */
function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12',
        className
      )}
      data-slot="empty"
      {...props}
    />
  );
}

/**
 * EmptyHeader component for empty state header content.
 * Provides consistent spacing for title and media in empty states.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element styled for empty state headers
 */
function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex max-w-sm flex-col items-center gap-2 text-center', className)}
      data-slot="empty-header"
      {...props}
    />
  );
}

/**
 * Empty media variant styles configuration using class-variance-authority.
 * Defines visual variants for empty state media/icons.
 */
const emptyMediaVariants = cva(
  'flex shrink-0 items-center justify-center mb-2 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
      },
    },
  }
);

/**
 * EmptyContent component for empty state main content area.
 * Provides consistent spacing for description and action elements.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element styled for empty state content
 */
function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance', className)}
      data-slot="empty-content"
      {...props}
    />
  );
}

/**
 * EmptyDescription component for empty state description text.
 * Supports link styling within the description.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'p'>} props - Standard p element props
 *
 * @returns {React.ReactElement} A div element styled for empty state descriptions
 */
function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <div
      className={cn(
        'text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4',
        className
      )}
      data-slot="empty-description"
      {...props}
    />
  );
}

/**
 * EmptyMedia component for empty state icons or media.
 * Supports default and icon variants for different visual styles.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {'default' | 'icon'} [variant='default'] - Visual style variant
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element styled for empty state media/icons
 */
function EmptyMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      className={cn(emptyMediaVariants({ className, variant }))}
      data-slot="empty-icon"
      data-variant={variant}
      {...props}
    />
  );
}

/**
 * EmptyTitle component for empty state titles.
 * Provides prominent heading styling for empty state messages.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element styled for empty state titles
 */
function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-lg font-medium tracking-tight', className)} data-slot="empty-title" {...props} />;
}

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle };
