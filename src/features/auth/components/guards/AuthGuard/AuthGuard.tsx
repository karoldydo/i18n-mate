import type { ReactNode } from 'react';

import { Navigate, useLocation } from 'react-router';

import { useAuth } from '@/app/providers/AuthProvider';
import { useConfig } from '@/app/providers/ConfigProvider';
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
 * Email verification requirement is controlled by app_config.email_verification_required.
 *
 * Usage:
 * ```tsx
 * <AuthGuard>
 *   <ProtectedPage />
 * </AuthGuard>
 * ```
 *
 * @param children - Protected content to render if authenticated
 * @param requireVerified - Override for email verification requirement (optional, defaults to config value)
 */
export function AuthGuard({ children, requireVerified }: AuthGuardProps) {
  const { isLoading: isAuthLoading, user } = useAuth();
  const { config, isLoading: isConfigLoading } = useConfig();
  const location = useLocation();

  // show loading state during session check or config load
  if (isAuthLoading || isConfigLoading) {
    return <Loading />;
  }

  // not authenticated → redirect to login with return url
  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  // determine if email verification is required
  // use prop override if provided, otherwise use config value (fail-closed: default to true if no config)
  const shouldRequireVerified = requireVerified ?? config?.emailVerificationRequired ?? true;

  // email not verified → redirect to verification page
  if (shouldRequireVerified && !user.email_confirmed_at) {
    return <Navigate replace to="/verify-email" />;
  }

  // authenticated and verified → render protected content
  return <>{children}</>;
}
