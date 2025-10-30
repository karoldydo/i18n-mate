import type { ReactNode } from 'react';

import { Home } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/shared/ui/button';

import { UserMenu } from '../common/UserMenu';

interface ProtectedLayoutProps {
  children: ReactNode;
}

/**
 * ProtectedLayout - Layout component wrapping all protected application pages
 *
 * Provides consistent structure with header containing:
 * - Application branding/logo
 * - Main navigation
 * - User menu with email and logout button
 *
 * Automatically redirects to /login for unauthenticated users via AuthGuard.
 */
export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <div className="bg-background min-h-screen">
      {/* header with navigation and user menu */}
      <header className="bg-sidebar supports-[backdrop-filter]:bg-sidebar/60 sticky top-0 z-50 w-full border-b backdrop-blur">
        <div className="container mx-auto flex h-14 items-center">
          {/* logo / branding */}
          <div className="mr-4 flex">
            <Link className="mr-6 flex items-center space-x-2" to="/projects">
              <span className="text-lg font-bold">i18n-mate</span>
            </Link>
          </div>

          {/* main navigation */}
          <nav className="flex flex-1 items-center space-x-2">
            <Button asChild size="sm" variant="ghost">
              <Link to="/projects">
                <Home className="mr-2 h-4 w-4" />
                Projects
              </Link>
            </Button>
          </nav>

          {/* user menu */}
          <div className="flex items-center justify-end">
            <UserMenu />
          </div>
        </div>
      </header>

      {/* main content area */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
