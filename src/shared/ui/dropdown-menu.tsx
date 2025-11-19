import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * DropdownMenu component root container.
 * Built on Radix UI DropdownMenu primitive for context menus and dropdowns.
 *
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Root>} props - Radix UI DropdownMenu root props
 *
 * @returns {React.ReactElement} A dropdown menu root element
 */
function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

/**
 * DropdownMenuCheckboxItem component for checkbox items in dropdown menus.
 * Displays a checkmark indicator when checked.
 *
 * @param {boolean} checked - Whether the checkbox is checked
 * @param {React.ReactNode} children - Item content to display
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>} props - Radix UI DropdownMenu checkbox item props
 *
 * @returns {React.ReactElement} A dropdown menu checkbox item with checkmark indicator
 */
function DropdownMenuCheckboxItem({
  checked,
  children,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      data-slot="dropdown-menu-checkbox-item"
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

/**
 * DropdownMenuContent component for the dropdown menu content area.
 * Includes portal, animations, and positioning.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {number} [sideOffset=4] - Offset distance from the trigger element
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Content>} props - Radix UI DropdownMenu content props
 *
 * @returns {React.ReactElement} A dropdown menu content container with portal and animations
 */
function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        className={cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md',
          className
        )}
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

/**
 * DropdownMenuGroup component for grouping dropdown menu items.
 * Used to organize related menu items.
 *
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Group>} props - Radix UI DropdownMenu group props
 *
 * @returns {React.ReactElement} A dropdown menu group container element
 */
function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

/**
 * DropdownMenuItem component for individual dropdown menu items.
 * Supports default and destructive variants, and inset padding.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {boolean} [inset] - Whether to apply inset padding (for nested items)
 * @param {'default' | 'destructive'} [variant='default'] - Visual style variant
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Item>} props - Radix UI DropdownMenu item props
 *
 * @returns {React.ReactElement} A dropdown menu item element with variant and inset support
 */
function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      data-inset={inset}
      data-slot="dropdown-menu-item"
      data-variant={variant}
      {...props}
    />
  );
}

/**
 * DropdownMenuLabel component for dropdown menu section labels.
 * Provides section headers within dropdown menus.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {boolean} [inset] - Whether to apply inset padding (for nested labels)
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Label>} props - Radix UI DropdownMenu label props
 *
 * @returns {React.ReactElement} A dropdown menu label element
 */
function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn('px-2 py-1.5 text-sm font-medium data-[inset]:pl-8', className)}
      data-inset={inset}
      data-slot="dropdown-menu-label"
      {...props}
    />
  );
}

/**
 * DropdownMenuPortal component for rendering dropdown menu outside the DOM hierarchy.
 * Ensures proper z-index stacking and accessibility.
 *
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Portal>} props - Radix UI DropdownMenu portal props
 *
 * @returns {React.ReactElement} A dropdown menu portal element
 */
function DropdownMenuPortal({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

/**
 * DropdownMenuRadioGroup component for radio button groups in dropdown menus.
 * Used for mutually exclusive selection within dropdown menus.
 *
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>} props - Radix UI DropdownMenu radio group props
 *
 * @returns {React.ReactElement} A dropdown menu radio group container element
 */
function DropdownMenuRadioGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

/**
 * DropdownMenuRadioItem component for radio button items in dropdown menus.
 * Displays a circle indicator when selected.
 *
 * @param {React.ReactNode} children - Item content to display
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>} props - Radix UI DropdownMenu radio item props
 *
 * @returns {React.ReactElement} A dropdown menu radio item with circle indicator
 */
function DropdownMenuRadioItem({
  children,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      data-slot="dropdown-menu-radio-item"
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

/**
 * DropdownMenuSeparator component for visual separation between menu items.
 * Provides a horizontal divider within dropdown menus.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Separator>} props - Radix UI DropdownMenu separator props
 *
 * @returns {React.ReactElement} A dropdown menu separator element
 */
function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      data-slot="dropdown-menu-separator"
      {...props}
    />
  );
}

/**
 * DropdownMenuShortcut component for displaying keyboard shortcuts.
 * Styled for displaying keyboard shortcut hints in menu items.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'span'>} props - Standard span element props
 *
 * @returns {React.ReactElement} A span element styled for keyboard shortcuts
 */
function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
      data-slot="dropdown-menu-shortcut"
      {...props}
    />
  );
}

/**
 * DropdownMenuSub component for nested sub-menus.
 * Used to create hierarchical dropdown menu structures.
 *
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Sub>} props - Radix UI DropdownMenu sub props
 *
 * @returns {React.ReactElement} A dropdown menu sub container element
 */
function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

/**
 * DropdownMenuSubContent component for sub-menu content area.
 * Includes animations and positioning for nested menus.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>} props - Radix UI DropdownMenu sub content props
 *
 * @returns {React.ReactElement} A dropdown menu sub content container with animations
 */
function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      className={cn(
        'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg',
        className
      )}
      data-slot="dropdown-menu-sub-content"
      {...props}
    />
  );
}

/**
 * DropdownMenuSubTrigger component for triggering sub-menus.
 * Displays a chevron right icon to indicate nested menu availability.
 *
 * @param {React.ReactNode} children - Trigger content to display
 * @param {string} [className] - Additional CSS classes to apply
 * @param {boolean} [inset] - Whether to apply inset padding (for nested triggers)
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>} props - Radix UI DropdownMenu sub trigger props
 *
 * @returns {React.ReactElement} A dropdown menu sub trigger with chevron icon
 */
function DropdownMenuSubTrigger({
  children,
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      data-inset={inset}
      data-slot="dropdown-menu-sub-trigger"
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

/**
 * DropdownMenuTrigger component for opening the dropdown menu.
 * Can wrap any element to make it trigger the dropdown menu.
 *
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>} props - Radix UI DropdownMenu trigger props
 *
 * @returns {React.ReactElement} A dropdown menu trigger element
 */
function DropdownMenuTrigger({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
