import { Loader2 } from 'lucide-react';

/**
 * InlineLoading - Inline loading spinner for route transitions
 *
 * Provides a centered loading indicator without fixed positioning or backdrop.
 * Used as Suspense fallback in App.tsx to show loading state only in the content area,
 * keeping the sidebar and navigation visible during route transitions.
 */
export function InlineLoading() {
  return (
    <div className="animate-in fade-in flex h-full items-center justify-center duration-300">
      <Loader2 className="text-primary h-12 w-12 animate-spin" />
    </div>
  );
}
