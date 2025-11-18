import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router';

import { useAuth } from '@/app/providers/AuthProvider';

import { useResendVerification } from '../../api/useResendVerification';
import { EmailVerificationScreen } from '../../components/common/EmailVerificationScreen';
import { AuthLayout } from '../../components/layouts/AuthLayout';

/**
 * VerifyEmailPage - Email verification page component
 *
 * Displays the email verification screen after registration.
 * Shows email address from navigation state or current user email.
 *
 * @returns {JSX.Element} Email verification page component
 */
export function VerifyEmailPage() {
  const location = useLocation();
  const { user } = useAuth();
  const resendVerification = useResendVerification();

  const email = useMemo(() => (location.state?.email as string) || user?.email, [location.state?.email, user?.email]);

  const handleResend = useCallback(async () => {
    return resendVerification.mutateAsync(email);
  }, [resendVerification, email]);

  return (
    <AuthLayout>
      <EmailVerificationScreen email={email} onResend={handleResend} />
    </AuthLayout>
  );
}
