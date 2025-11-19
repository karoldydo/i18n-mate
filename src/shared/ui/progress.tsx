import * as ProgressPrimitive from '@radix-ui/react-progress';
import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * Progress component for displaying progress indicators.
 * Built on Radix UI Progress primitive with animated progress bar.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {number} [value] - Progress value between 0 and 100
 * @param {React.ComponentProps<typeof ProgressPrimitive.Root>} props - Radix UI Progress root props
 *
 * @returns {React.ReactElement} A progress bar element with animated indicator
 */
function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      className={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
      data-slot="progress"
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="bg-primary h-full w-full flex-1 transition-all"
        data-slot="progress-indicator"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
