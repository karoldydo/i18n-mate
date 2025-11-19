'use client';

import * as SheetPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * Sheet component root container.
 * Built on Radix UI Dialog primitive for slide-out panels.
 *
 * @param {React.ComponentProps<typeof SheetPrimitive.Root>} props - Radix UI Dialog root props
 *
 * @returns {React.ReactElement} A sheet root element
 */
function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

/**
 * SheetClose component for closing the sheet.
 * Can be used as a trigger button to close the sheet.
 *
 * @param {React.ComponentProps<typeof SheetPrimitive.Close>} props - Radix UI Dialog close props
 *
 * @returns {React.ReactElement} A sheet close button element
 */
function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

/**
 * SheetContent component for the main sheet content area.
 * Includes overlay, animations, and side positioning.
 *
 * @param {React.ReactNode} children - Content to display in the sheet
 * @param {string} [className] - Additional CSS classes to apply
 * @param {'bottom' | 'left' | 'right' | 'top'} [side='right'] - Side from which the sheet slides in
 * @param {React.ComponentProps<typeof SheetPrimitive.Content>} props - Radix UI Dialog content props
 *
 * @returns {React.ReactElement} A sheet content container with overlay, animations, and close button
 */
function SheetContent({
  children,
  className,
  side = 'right',
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'bottom' | 'left' | 'right' | 'top';
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
          side === 'right' &&
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
          side === 'left' &&
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
          side === 'top' &&
            'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
          side === 'bottom' &&
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
          className
        )}
        data-slot="sheet-content"
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

/**
 * SheetDescription component for sheet description text.
 * Provides accessible description for screen readers.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof SheetPrimitive.Description>} props - Radix UI Dialog description props
 *
 * @returns {React.ReactElement} A sheet description element
 */
function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      data-slot="sheet-description"
      {...props}
    />
  );
}

/**
 * SheetFooter component for sheet action buttons.
 * Provides consistent spacing and layout for sheet footers.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A sheet footer container element
 */
function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-auto flex flex-col gap-2 p-4', className)} data-slot="sheet-footer" {...props} />;
}

/**
 * SheetHeader component for sheet title and description.
 * Provides consistent spacing and layout for sheet headers.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A sheet header container element
 */
function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 p-4', className)} data-slot="sheet-header" {...props} />;
}

/**
 * SheetOverlay component for the sheet backdrop.
 * Provides semi-transparent overlay behind the sheet with fade animations.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof SheetPrimitive.Overlay>} props - Radix UI Dialog overlay props
 *
 * @returns {React.ReactElement} A sheet overlay element with fade animations
 */
function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className
      )}
      data-slot="sheet-overlay"
      {...props}
    />
  );
}

/**
 * SheetPortal component for rendering sheet outside the DOM hierarchy.
 * Ensures proper z-index stacking and accessibility.
 *
 * @param {React.ComponentProps<typeof SheetPrimitive.Portal>} props - Radix UI Dialog portal props
 *
 * @returns {React.ReactElement} A sheet portal element
 */
function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

/**
 * SheetTitle component for sheet heading.
 * Provides accessible title for screen readers and visual hierarchy.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof SheetPrimitive.Title>} props - Radix UI Dialog title props
 *
 * @returns {React.ReactElement} A sheet title element
 */
function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cn('text-foreground font-semibold', className)}
      data-slot="sheet-title"
      {...props}
    />
  );
}

/**
 * SheetTrigger component for opening the sheet.
 * Can wrap any element to make it trigger the sheet.
 *
 * @param {React.ComponentProps<typeof SheetPrimitive.Trigger>} props - Radix UI Dialog trigger props
 *
 * @returns {React.ReactElement} A sheet trigger element
 */
function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger };
