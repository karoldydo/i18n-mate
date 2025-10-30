import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { AUTH_SUCCESS_MESSAGES } from '@/shared/constants';

import type { ForgotPasswordFormData } from '../api/auth.schemas';

import { useResetPassword } from '../api';
import { ForgotPasswordForm } from '../components/forms/ForgotPasswordForm';
import { AuthLayout } from '../components/layouts/AuthLayout';

/**
 * ForgotPasswordPage - Password reset request page component
 *
 * Displays the forgot password form within the authentication layout.
 * Shows success message after sending the reset email.
 */
export function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false);
  const resetPassword = useResetPassword();

  const handleSubmit = useCallback(
    (data: ForgotPasswordFormData) => {
      resetPassword.mutate(data, {
        onError: (error) => {
          toast.error(error.error.message);
        },
        onSuccess: () => {
          setEmailSent(true);
          toast.success(AUTH_SUCCESS_MESSAGES.EMAIL_SENT);
        },
      });
    },
    [resetPassword]
  );

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Reset your password</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {emailSent
              ? 'Check your email for a password reset link'
              : "Enter your email and we'll send you instructions"}
          </p>
        </div>

        {emailSent ? (
          <div className="space-y-4 text-center">
            <div className="bg-primary/10 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-full">
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
            <p className="text-muted-foreground text-sm">
              If an account exists with that email, you&apos;ll receive a password reset link shortly.
            </p>
            <p className="text-muted-foreground text-sm">Please check your inbox and spam folder.</p>
          </div>
        ) : (
          <ForgotPasswordForm isSubmitting={resetPassword.isPending} onSubmit={handleSubmit} />
        )}
      </div>
    </AuthLayout>
  );
}
