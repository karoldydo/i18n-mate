import type { ReactNode } from 'react';

import { Navigate, useLocation } from 'react-router';

import { useAuth } from '@/app/providers/AuthProvider';
import { Loading } from '@/shared/components';

interface AuthGuardProps {
  children: ReactNode;
  requireVerified?: boolean;
}

/**
 * AuthGuard - Route protection component
 *
 * Guards protected routes by checking authentication state and email verification.
 * Redirects unauthenticated users to login and unverified users to verification page.
 *
 * Usage:
 * ```tsx
 * <AuthGuard>
 *   <ProtectedPage />
 * </AuthGuard>
 * ```
 *
 * @param children - Protected content to render if authenticated
 * @param requireVerified - Whether email verification is required (default: true)
 */
export function AuthGuard({ children, requireVerified = true }: AuthGuardProps) {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  // show loading state during session check
  if (isLoading) {
    return <Loading />;
  }

  // not authenticated → redirect to login with return url
  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  // email not verified → redirect to verification page
  if (requireVerified && !user.email_confirmed_at) {
    return <Navigate replace to="/verify-email" />;
  }

  // authenticated and verified → render protected content
  return <>{children}</>;
}
