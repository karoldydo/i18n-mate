import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { AUTH_SUCCESS_MESSAGES } from '@/shared/constants';

import type { ResetPasswordFormData } from '../api/auth.schemas';

import { useUpdatePassword } from '../api';
import { ResetPasswordForm } from '../components/forms/ResetPasswordForm';
import { AuthLayout } from '../components/layouts/AuthLayout';

/**
 * ResetPasswordPage - Password reset page component
 *
 * Displays the reset password form within the authentication layout.
 * Used when user clicks the reset link from email.
 * Redirects to login after successful password reset.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const updatePassword = useUpdatePassword();

  const handleSubmit = useCallback(
    (data: ResetPasswordFormData) => {
      updatePassword.mutate(data, {
        onError: (error) => {
          toast.error(error.error.message);
        },
        onSuccess: () => {
          toast.success(AUTH_SUCCESS_MESSAGES.PASSWORD_RESET);
          // after successful password reset, redirect to login
          navigate('/login');
        },
      });
    },
    [navigate, updatePassword]
  );

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Set new password</h2>
          <p className="text-muted-foreground mt-2 text-sm">Enter your new password below</p>
        </div>

        <ResetPasswordForm isSubmitting={updatePassword.isPending} onSubmit={handleSubmit} />
      </div>
    </AuthLayout>
  );
}
