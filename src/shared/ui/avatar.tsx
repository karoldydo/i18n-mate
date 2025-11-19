import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * Avatar component root container.
 * Provides a circular container for displaying user avatars or profile images.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof AvatarPrimitive.Root>} props - Radix UI Avatar root props
 *
 * @returns {React.ReactElement} A div element styled as an avatar container
 */
function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
      data-slot="avatar"
      {...props}
    />
  );
}

/**
 * AvatarFallback component for displaying fallback content when image fails to load.
 * Typically shows initials or a placeholder icon.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof AvatarPrimitive.Fallback>} props - Radix UI Avatar fallback props
 *
 * @returns {React.ReactElement} A span element styled as avatar fallback
 */
function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn('bg-muted flex size-full items-center justify-center rounded-full', className)}
      data-slot="avatar-fallback"
      {...props}
    />
  );
}

/**
 * AvatarImage component for displaying the avatar image.
 * Automatically falls back to AvatarFallback if the image fails to load.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof AvatarPrimitive.Image>} props - Radix UI Avatar image props
 *
 * @returns {React.ReactElement} An img element styled as avatar image
 */
function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image className={cn('aspect-square size-full', className)} data-slot="avatar-image" {...props} />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
