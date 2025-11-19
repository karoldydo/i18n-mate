import { cn } from '@/shared/utils/index';

/**
 * Skeleton component for loading state placeholders.
 * Provides a pulsing animation to indicate content is loading.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element with skeleton loading animation
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('bg-accent animate-pulse rounded-md', className)} data-slot="skeleton" {...props} />;
}

export { Skeleton };
