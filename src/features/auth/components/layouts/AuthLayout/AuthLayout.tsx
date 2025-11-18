import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * AuthLayout - Layout component wrapping all authentication pages
 *
 * Provides a centered, responsive container with maximum width of 400px,
 * application branding at the top, and a neutral background with subtle gradient.
 *
 * @param {AuthLayoutProps} props - Component props
 * @param {ReactNode} props.children - Content to render within the authentication layout
 *
 * @returns {JSX.Element} Authentication layout component
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="g-sidebar supports-[backdrop-filter]:bg-sidebar/60 min-h-screen from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* application logo */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">i18n-mate</h1>
            <p className="text-muted-foreground mt-2 text-sm">Translation management made simple</p>
          </div>

          {/* authentication content */}
          <div className="bg-card rounded-lg border p-8 shadow-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
