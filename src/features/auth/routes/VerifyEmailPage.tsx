import { useCallback, useLayoutEffect, useMemo } from 'react';
import { useLocation } from 'react-router';

import { useAuth } from '@/app/providers/AuthProvider';
import { useResendCooldown } from '@/shared/hooks';

import { useResendVerification } from '../api';
import { EmailVerificationScreen } from '../components/common/EmailVerificationScreen';
import { AuthLayout } from '../components/layouts/AuthLayout';

/**
 * VerifyEmailPage - Email verification page component
 *
 * Displays the email verification screen after registration.
 * Shows email address from navigation state or current user email.
 * Automatically starts 60-second cooldown when arriving from registration.
 */
export function VerifyEmailPage() {
  const location = useLocation();
  const { user } = useAuth();
  const resendVerification = useResendVerification();
  const { hasActiveCooldown, startCooldown } = useResendCooldown();

  const email = useMemo(() => (location.state?.email as string) || user?.email, [location.state?.email, user?.email]);
  const isFromRegistration = useMemo(() => Boolean(location.state?.email), [location.state?.email]);

  // start cooldown when arriving from registration, but only if no cooldown is already active
  useLayoutEffect(() => {
    if (isFromRegistration && !hasActiveCooldown) {
      startCooldown();
    }
  }, [isFromRegistration, hasActiveCooldown, startCooldown]);

  const handleResend = useCallback(async () => {
    return resendVerification.mutateAsync(email);
  }, [resendVerification, email]);

  return (
    <AuthLayout>
      <EmailVerificationScreen email={email} onResend={handleResend} />
    </AuthLayout>
  );
}
