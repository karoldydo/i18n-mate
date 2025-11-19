'use client';

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * ScrollArea component for custom scrollable containers.
 * Built on Radix UI ScrollArea primitive with custom scrollbar styling.
 *
 * @param {React.ReactNode} children - Content to display in the scroll area
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof ScrollAreaPrimitive.Root>} props - Radix UI ScrollArea root props
 *
 * @returns {React.ReactElement} A scroll area container with viewport and scrollbar
 */
function ScrollArea({ children, className, ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root className={cn('relative', className)} data-slot="scroll-area" {...props}>
      <ScrollAreaPrimitive.Viewport
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
        data-slot="scroll-area-viewport"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

/**
 * ScrollBar component for custom scrollbar styling.
 * Supports both vertical and horizontal orientations.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {'horizontal' | 'vertical'} [orientation='vertical'] - Orientation of the scrollbar
 * @param {React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>} props - Radix UI ScrollArea scrollbar props
 *
 * @returns {React.ReactElement} A scrollbar element with thumb indicator
 */
function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      className={cn(
        'flex touch-none p-px transition-colors select-none',
        orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent',
        orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
        className
      )}
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        className="bg-border relative flex-1 rounded-full"
        data-slot="scroll-area-thumb"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
