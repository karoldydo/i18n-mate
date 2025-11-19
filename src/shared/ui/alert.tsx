import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * Alert variant styles configuration using class-variance-authority.
 * Defines visual variants for alert components.
 */
const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
      },
    },
  }
);

/**
 * Alert component for displaying important messages to users.
 * Supports icon placement and multiple visual variants.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {'default' | 'destructive'} [variant] - Visual style variant
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element with alert styling and role="alert"
 */
function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div className={cn(alertVariants({ variant }), className)} data-slot="alert" role="alert" {...props} />;
}

/**
 * AlertDescription component for displaying detailed alert content.
 * Used within Alert to provide additional context or information.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element styled for alert descriptions
 */
function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
        className
      )}
      data-slot="alert-description"
      {...props}
    />
  );
}

/**
 * AlertTitle component for displaying the main heading of an alert.
 * Used within Alert to provide a prominent title.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element styled for alert titles
 */
function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', className)}
      data-slot="alert-title"
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
