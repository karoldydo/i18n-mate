import { Loader2 } from 'lucide-react';

/**
 * Loading - Centered loading spinner with backdrop blur and fade-in animation
 *
 * Provides a full-screen loading indicator with blurred background.
 * Used as Suspense fallback to prevent content blinking during navigation.
 * Includes smooth fade-in animation for better UX.
 */
export function Loading() {
  return (
    <div className="animate-in fade-in bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm duration-300">
      <Loader2 className="text-primary h-12 w-12 animate-spin" />
    </div>
  );
}
