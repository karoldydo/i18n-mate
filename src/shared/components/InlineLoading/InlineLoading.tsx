import { Loader2 } from 'lucide-react';

/**
 * InlineLoading – Displays an inline, centered loading spinner for content area transitions.
 *
 * Renders a spinning loader icon vertically and horizontally centered within its parent,
 * without fixed positioning or backdrop. Typically used as a Suspense fallback in
 * App.tsx to indicate route-level loading, ensuring that global UI elements like
 * the sidebar and navigation remain visible during content updates or route transitions.
 *
 * @returns {JSX.Element} A visually centered loading spinner for inline content loading states
 */
export function InlineLoading() {
  return (
    <div className="animate-in fade-in flex h-full items-center justify-center duration-300">
      <Loader2 className="text-primary h-12 w-12 animate-spin" />
    </div>
  );
}
