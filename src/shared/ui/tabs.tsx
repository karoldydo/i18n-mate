import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * Tabs component root container.
 * Built on Radix UI Tabs primitive for tabbed interfaces.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof TabsPrimitive.Root>} props - Radix UI Tabs root props
 *
 * @returns {React.ReactElement} A tabs root element with flex layout
 */
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-2', className)} data-slot="tabs" {...props} />;
}

/**
 * TabsContent component for tab panel content.
 * Displays content for the active tab.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof TabsPrimitive.Content>} props - Radix UI Tabs content props
 *
 * @returns {React.ReactElement} A tabs content element styled for tab panels
 */
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('flex-1 outline-none', className)} data-slot="tabs-content" {...props} />;
}

/**
 * TabsList component for tab trigger container.
 * Provides background and layout for tab buttons.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof TabsPrimitive.List>} props - Radix UI Tabs list props
 *
 * @returns {React.ReactElement} A tabs list element styled for tab triggers
 */
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]',
        className
      )}
      data-slot="tabs-list"
      {...props}
    />
  );
}

/**
 * TabsTrigger component for tab buttons.
 * Provides active state styling and focus management.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof TabsPrimitive.Trigger>} props - Radix UI Tabs trigger props
 *
 * @returns {React.ReactElement} A tabs trigger button element with active and focus states
 */
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      data-slot="tabs-trigger"
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
