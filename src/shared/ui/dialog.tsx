'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * Dialog component root container.
 * Built on Radix UI Dialog primitive for modal dialogs.
 *
 * @param {React.ComponentProps<typeof DialogPrimitive.Root>} props - Radix UI Dialog root props
 *
 * @returns {React.ReactElement} A dialog root element
 */
function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

/**
 * DialogClose component for closing the dialog.
 * Can be used as a trigger button to close the dialog.
 *
 * @param {React.ComponentProps<typeof DialogPrimitive.Close>} props - Radix UI Dialog close props
 *
 * @returns {React.ReactElement} A dialog close button element
 */
function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/**
 * DialogContent component for the main dialog content area.
 * Includes overlay, animations, and optional close button.
 *
 * @param {React.ReactNode} children - Content to display in the dialog
 * @param {string} [className] - Additional CSS classes to apply
 * @param {boolean} [showCloseButton=true] - Whether to show the close button in the top-right corner
 * @param {React.ComponentProps<typeof DialogPrimitive.Content>} props - Radix UI Dialog content props
 *
 * @returns {React.ReactElement} A dialog content container with overlay and animations
 */
function DialogContent({
  children,
  className,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          className
        )}
        data-slot="dialog-content"
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            data-slot="dialog-close"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/**
 * DialogDescription component for dialog description text.
 * Provides accessible description for screen readers.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof DialogPrimitive.Description>} props - Radix UI Dialog description props
 *
 * @returns {React.ReactElement} A dialog description element
 */
function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      data-slot="dialog-description"
      {...props}
    />
  );
}

/**
 * DialogFooter component for dialog action buttons.
 * Responsive layout with buttons stacked on mobile and aligned right on desktop.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A dialog footer container element
 */
function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      data-slot="dialog-footer"
      {...props}
    />
  );
}

/**
 * DialogHeader component for dialog title and description.
 * Provides consistent spacing and layout for dialog headers.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A dialog header container element
 */
function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      data-slot="dialog-header"
      {...props}
    />
  );
}

/**
 * DialogOverlay component for the dialog backdrop.
 * Provides semi-transparent overlay behind the dialog with fade animations.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof DialogPrimitive.Overlay>} props - Radix UI Dialog overlay props
 *
 * @returns {React.ReactElement} A dialog overlay element with fade animations
 */
function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className
      )}
      data-slot="dialog-overlay"
      {...props}
    />
  );
}

/**
 * DialogPortal component for rendering dialog outside the DOM hierarchy.
 * Ensures proper z-index stacking and accessibility.
 *
 * @param {React.ComponentProps<typeof DialogPrimitive.Portal>} props - Radix UI Dialog portal props
 *
 * @returns {React.ReactElement} A dialog portal element
 */
function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

/**
 * DialogTitle component for dialog heading.
 * Provides accessible title for screen readers and visual hierarchy.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof DialogPrimitive.Title>} props - Radix UI Dialog title props
 *
 * @returns {React.ReactElement} A dialog title element
 */
function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg leading-none font-semibold', className)}
      data-slot="dialog-title"
      {...props}
    />
  );
}

/**
 * DialogTrigger component for opening the dialog.
 * Can wrap any element to make it trigger the dialog.
 *
 * @param {React.ComponentProps<typeof DialogPrimitive.Trigger>} props - Radix UI Dialog trigger props
 *
 * @returns {React.ReactElement} A dialog trigger element
 */
function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
