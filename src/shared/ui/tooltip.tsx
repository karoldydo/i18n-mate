import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * Tooltip component root container.
 * Built on Radix UI Tooltip primitive with automatic provider wrapping.
 *
 * @param {React.ComponentProps<typeof TooltipPrimitive.Root>} props - Radix UI Tooltip root props
 *
 * @returns {React.ReactElement} A tooltip root element wrapped in TooltipProvider
 */
function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

/**
 * TooltipContent component for tooltip content display.
 * Includes animations, positioning, and arrow indicator.
 *
 * @param {React.ReactNode} children - Tooltip content to display
 * @param {string} [className] - Additional CSS classes to apply
 * @param {number} [sideOffset=0] - Offset distance from the trigger element
 * @param {React.ComponentProps<typeof TooltipPrimitive.Content>} props - Radix UI Tooltip content props
 *
 * @returns {React.ReactElement} A tooltip content element with portal, animations, and arrow
 */
function TooltipContent({
  children,
  className,
  sideOffset = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className={cn(
          'bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance',
          className
        )}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

/**
 * TooltipProvider component for tooltip context and configuration.
 * Configures tooltip behavior including delay duration.
 *
 * @param {number} [delayDuration=0] - Delay in milliseconds before showing tooltip
 * @param {React.ComponentProps<typeof TooltipPrimitive.Provider>} props - Radix UI Tooltip provider props
 *
 * @returns {React.ReactElement} A tooltip provider element
 */
function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

/**
 * TooltipTrigger component for elements that trigger tooltips.
 * Can wrap any element to make it trigger a tooltip on hover.
 *
 * @param {React.ComponentProps<typeof TooltipPrimitive.Trigger>} props - Radix UI Tooltip trigger props
 *
 * @returns {React.ReactElement} A tooltip trigger element
 */
function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
