import { Loader2 } from 'lucide-react';

/**
 * Loading - Full-screen loading spinner with backdrop blur
 *
 * Provides a full-screen loading indicator with blurred background (fixed positioning).
 * Used primarily for initial authentication checks in AuthGuard.
 * For route transitions, use InlineLoading instead to keep navigation visible.
 * Includes smooth fade-in animation for better UX.
 */
export function Loading() {
  return (
    <div className="animate-in fade-in bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm duration-300">
      <Loader2 className="text-primary h-12 w-12 animate-spin" />
    </div>
  );
}
