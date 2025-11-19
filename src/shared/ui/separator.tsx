import * as SeparatorPrimitive from '@radix-ui/react-separator';
import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * Separator component for visual division between content sections.
 * Built on Radix UI Separator primitive with horizontal and vertical orientations.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {boolean} [decorative=true] - Whether the separator is decorative (not semantically meaningful)
 * @param {'horizontal' | 'vertical'} [orientation='horizontal'] - Orientation of the separator
 * @param {React.ComponentProps<typeof SeparatorPrimitive.Root>} props - Radix UI Separator root props
 *
 * @returns {React.ReactElement} A separator element with horizontal or vertical styling
 */
function Separator({
  className,
  decorative = true,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      className={cn(
        'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        className
      )}
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      {...props}
    />
  );
}

export { Separator };
