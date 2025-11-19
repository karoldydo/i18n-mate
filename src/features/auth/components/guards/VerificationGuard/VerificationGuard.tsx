import type { ReactNode } from 'react';

import { Navigate } from 'react-router';

import { useConfig } from '@/app/providers/ConfigProvider';
import { Loading } from '@/shared/components/Loading';

interface VerificationGuardProps {
  children: ReactNode;
}

/**
 * VerificationGuard - Email verification route protection component
 *
 * Guards the /verify-email route by checking if email verification is required via app_config.
 * Redirects to projects page if email verification is disabled.
 * Shows loading state while config is being fetched (fail-closed approach).
 *
 * @param {VerificationGuardProps} props - Component props
 * @param {ReactNode} props.children - Verification page content to render if verification is required
 *
 * @returns {JSX.Element} Verification page content or redirect component
 */
export function VerificationGuard({ children }: VerificationGuardProps) {
  const { config, isLoading } = useConfig();

  // fail-closed: show loading state until config loads
  if (isLoading) {
    return <Loading />;
  }

  // if email verification not required, redirect to projects
  if (!config?.emailVerificationRequired) {
    return <Navigate replace to="/projects" />;
  }

  // email verification required → render verification page
  return <>{children}</>;
}
