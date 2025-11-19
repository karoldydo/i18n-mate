import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * Label component for form field labels.
 * Built on Radix UI Label primitive with accessibility features and disabled state handling.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof LabelPrimitive.Root>} props - Radix UI Label root props
 *
 * @returns {React.ReactElement} A label element with form label styling
 */
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className
      )}
      data-slot="label"
      {...props}
    />
  );
}

export { Label };
