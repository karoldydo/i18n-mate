import { useCallback, useState } from 'react';
import { Link } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

interface EmailVerificationScreenProps {
  email?: string;
  onResend: () => Promise<void>;
}

/**
 * EmailVerificationScreen - Component displayed after registration
 *
 * Shows a message about the sent verification email with option to resend.
 * Provides feedback on resend action with success/error states.
 */
export function EmailVerificationScreen({ email, onResend }: EmailVerificationScreenProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'error' | 'idle' | 'success'>('idle');

  const handleResend = useCallback(async () => {
    setIsResending(true);
    setResendStatus('idle');

    try {
      await onResend();
      setResendStatus('success');
    } catch {
      setResendStatus('error');
    } finally {
      setIsResending(false);
    }
  }, [onResend]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <svg
            aria-hidden="true"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          We&apos;ve sent a verification link to
          {email ? <span className="font-medium"> {email}</span> : ' your email address'}
        </p>
      </div>

      {resendStatus === 'success' && (
        <Alert>
          <AlertTitle>Email sent</AlertTitle>
          <AlertDescription>Verification email has been resent. Please check your inbox.</AlertDescription>
        </Alert>
      )}

      {resendStatus === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to resend verification email. Please try again.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <p className="text-muted-foreground text-center text-sm">
          Didn&apos;t receive the email? Check your spam folder or
        </p>

        <Button className="w-full" disabled={isResending} onClick={handleResend} variant="outline">
          {isResending ? 'Sending...' : 'Send again'}
        </Button>

        <p className="text-muted-foreground text-center text-sm">
          <Link className="text-primary hover:text-primary/80 underline-offset-4 hover:underline" to="/login">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
