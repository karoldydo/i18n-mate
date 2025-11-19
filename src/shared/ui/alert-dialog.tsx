import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import * as React from 'react';

import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/utils/index';

/**
 * AlertDialog component root container.
 * Built on Radix UI AlertDialog primitive for confirmation dialogs.
 *
 * @param {React.ComponentProps<typeof AlertDialogPrimitive.Root>} props - Radix UI AlertDialog root props
 *
 * @returns {React.ReactElement} An alert dialog root element
 */
function AlertDialog({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

/**
 * AlertDialogAction component for the primary action button.
 * Styled as a default button variant for confirmation actions.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof AlertDialogPrimitive.Action>} props - Radix UI AlertDialog action props
 *
 * @returns {React.ReactElement} An alert dialog action button element
 */
function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />;
}

/**
 * AlertDialogCancel component for the cancel action button.
 * Styled as an outline button variant for cancel actions.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof AlertDialogPrimitive.Cancel>} props - Radix UI AlertDialog cancel props
 *
 * @returns {React.ReactElement} An alert dialog cancel button element
 */
function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }), className)} {...props} />;
}

/**
 * AlertDialogContent component for the main alert dialog content area.
 * Includes overlay and animations.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof AlertDialogPrimitive.Content>} props - Radix UI AlertDialog content props
 *
 * @returns {React.ReactElement} An alert dialog content container with overlay and animations
 */
function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          className
        )}
        data-slot="alert-dialog-content"
        {...props}
      />
    </AlertDialogPortal>
  );
}

/**
 * AlertDialogDescription component for alert dialog description text.
 * Provides accessible description for screen readers.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof AlertDialogPrimitive.Description>} props - Radix UI AlertDialog description props
 *
 * @returns {React.ReactElement} An alert dialog description element
 */
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      data-slot="alert-dialog-description"
      {...props}
    />
  );
}

/**
 * AlertDialogFooter component for alert dialog action buttons.
 * Responsive layout with buttons stacked on mobile and aligned right on desktop.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} An alert dialog footer container element
 */
function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      data-slot="alert-dialog-footer"
      {...props}
    />
  );
}

/**
 * AlertDialogHeader component for alert dialog title and description.
 * Provides consistent spacing and layout for alert dialog headers.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} An alert dialog header container element
 */
function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      data-slot="alert-dialog-header"
      {...props}
    />
  );
}

/**
 * AlertDialogOverlay component for the alert dialog backdrop.
 * Provides semi-transparent overlay behind the alert dialog with fade animations.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof AlertDialogPrimitive.Overlay>} props - Radix UI AlertDialog overlay props
 *
 * @returns {React.ReactElement} An alert dialog overlay element with fade animations
 */
function AlertDialogOverlay({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className
      )}
      data-slot="alert-dialog-overlay"
      {...props}
    />
  );
}

/**
 * AlertDialogPortal component for rendering alert dialog outside the DOM hierarchy.
 * Ensures proper z-index stacking and accessibility.
 *
 * @param {React.ComponentProps<typeof AlertDialogPrimitive.Portal>} props - Radix UI AlertDialog portal props
 *
 * @returns {React.ReactElement} An alert dialog portal element
 */
function AlertDialogPortal({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

/**
 * AlertDialogTitle component for alert dialog heading.
 * Provides accessible title for screen readers and visual hierarchy.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof AlertDialogPrimitive.Title>} props - Radix UI AlertDialog title props
 *
 * @returns {React.ReactElement} An alert dialog title element
 */
function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn('text-lg font-semibold', className)}
      data-slot="alert-dialog-title"
      {...props}
    />
  );
}

/**
 * AlertDialogTrigger component for opening the alert dialog.
 * Can wrap any element to make it trigger the alert dialog.
 *
 * @param {React.ComponentProps<typeof AlertDialogPrimitive.Trigger>} props - Radix UI AlertDialog trigger props
 *
 * @returns {React.ReactElement} An alert dialog trigger element
 */
function AlertDialogTrigger({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
