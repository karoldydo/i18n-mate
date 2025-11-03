import type { ReactNode } from 'react';

import { Navigate } from 'react-router';

import { useConfig } from '@/app/providers/ConfigProvider';
import { Loading } from '@/shared/components';

interface RegistrationGuardProps {
  children: ReactNode;
}

/**
 * RegistrationGuard - Registration route protection component
 *
 * Guards the registration route by checking if registration is enabled via app_config.
 * Redirects to login page if registration is disabled.
 * Shows loading state while config is being fetched (fail-closed approach).
 *
 * Usage:
 * ```tsx
 * <RegistrationGuard>
 *   <RegisterPage />
 * </RegistrationGuard>
 * ```
 *
 * @param children - Registration page content to render if registration is enabled
 */
export function RegistrationGuard({ children }: RegistrationGuardProps) {
  const { config, isLoading } = useConfig();

  // fail-closed: show loading state until config loads
  if (isLoading) {
    return <Loading />;
  }

  // if registration disabled, redirect to login
  if (!config?.registrationEnabled) {
    return <Navigate replace to="/login" />;
  }

  // registration enabled → render registration page
  return <>{children}</>;
}
