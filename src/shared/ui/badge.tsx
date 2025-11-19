import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * Badge variant styles configuration using class-variance-authority.
 * Defines visual variants for badge components.
 */
const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
      },
    },
  }
);

/**
 * Badge component for displaying labels, tags, or status indicators.
 * Supports polymorphic rendering via the asChild prop using Radix UI Slot.
 *
 * @param {boolean} [asChild=false] - When true, renders as a child component instead of a span element
 * @param {string} [className] - Additional CSS classes to apply
 * @param {'default' | 'destructive' | 'outline' | 'secondary'} [variant] - Visual style variant
 * @param {React.ComponentProps<'span'>} props - Standard span element props
 *
 * @returns {React.ReactElement} A span element or child component with badge styling
 */
function Badge({
  asChild = false,
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return <Comp className={cn(badgeVariants({ variant }), className)} data-slot="badge" {...props} />;
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants };
