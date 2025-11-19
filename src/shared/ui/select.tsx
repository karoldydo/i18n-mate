'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * Select component root container.
 * Built on Radix UI Select primitive for dropdown selection.
 *
 * @param {React.ComponentProps<typeof SelectPrimitive.Root>} props - Radix UI Select root props
 *
 * @returns {React.ReactElement} A select root element
 */
function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

/**
 * SelectContent component for the select dropdown content.
 * Includes animations, positioning, and scroll buttons.
 *
 * @param {'center' | 'end' | 'start'} [align='center'] - Alignment of the content relative to the trigger
 * @param {React.ReactNode} children - Content to display in the select dropdown
 * @param {string} [className] - Additional CSS classes to apply
 * @param {'popper' | 'item-aligned'} [position='popper'] - Positioning strategy for the dropdown
 * @param {React.ComponentProps<typeof SelectPrimitive.Content>} props - Radix UI Select content props
 *
 * @returns {React.ReactElement} A select content container with portal, animations, and scroll buttons
 */
function SelectContent({
  align = 'center',
  children,
  className,
  position = 'popper',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        align={align}
        className={cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className
        )}
        data-slot="select-content"
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

/**
 * SelectGroup component for grouping select items.
 * Used to organize related select items with optional labels.
 *
 * @param {React.ComponentProps<typeof SelectPrimitive.Group>} props - Radix UI Select group props
 *
 * @returns {React.ReactElement} A select group container element
 */
function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

/**
 * SelectItem component for individual select options.
 * Displays a checkmark indicator when selected.
 *
 * @param {React.ReactNode} children - Item content to display
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof SelectPrimitive.Item>} props - Radix UI Select item props
 *
 * @returns {React.ReactElement} A select item element with checkmark indicator
 */
function SelectItem({ children, className, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      data-slot="select-item"
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

/**
 * SelectLabel component for select group labels.
 * Provides section headers within select dropdowns.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof SelectPrimitive.Label>} props - Radix UI Select label props
 *
 * @returns {React.ReactElement} A select label element
 */
function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn('text-muted-foreground px-2 py-1.5 text-xs', className)}
      data-slot="select-label"
      {...props}
    />
  );
}

/**
 * SelectScrollDownButton component for scrolling down in long select lists.
 * Displays a chevron down icon when more items are available below.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>} props - Radix UI Select scroll down button props
 *
 * @returns {React.ReactElement} A scroll down button with chevron icon
 */
function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      data-slot="select-scroll-down-button"
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

/**
 * SelectScrollUpButton component for scrolling up in long select lists.
 * Displays a chevron up icon when more items are available above.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>} props - Radix UI Select scroll up button props
 *
 * @returns {React.ReactElement} A scroll up button with chevron icon
 */
function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      data-slot="select-scroll-up-button"
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

/**
 * SelectSeparator component for visual separation between select items.
 * Provides a horizontal divider within select dropdowns.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof SelectPrimitive.Separator>} props - Radix UI Select separator props
 *
 * @returns {React.ReactElement} A select separator element
 */
function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn('bg-border pointer-events-none -mx-1 my-1 h-px', className)}
      data-slot="select-separator"
      {...props}
    />
  );
}

/**
 * SelectTrigger component for the select button that opens the dropdown.
 * Displays the selected value and a chevron down icon.
 *
 * @param {React.ReactNode} children - Trigger content, typically SelectValue
 * @param {string} [className] - Additional CSS classes to apply
 * @param {'default' | 'sm'} [size='default'] - Size variant of the trigger
 * @param {React.ComponentProps<typeof SelectPrimitive.Trigger>} props - Radix UI Select trigger props
 *
 * @returns {React.ReactElement} A select trigger button element
 */
function SelectTrigger({
  children,
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'default' | 'sm';
}) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      data-size={size}
      data-slot="select-trigger"
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/**
 * SelectValue component for displaying the selected value in the trigger.
 * Shows placeholder text when no value is selected.
 *
 * @param {React.ComponentProps<typeof SelectPrimitive.Value>} props - Radix UI Select value props
 *
 * @returns {React.ReactElement} A select value display element
 */
function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
