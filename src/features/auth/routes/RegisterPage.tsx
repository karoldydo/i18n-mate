import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { AUTH_SUCCESS_MESSAGES } from '@/shared/constants';

import type { RegisterFormData } from '../api/auth.schemas';

import { useSignUp } from '../api';
import { RegisterForm } from '../components/forms/RegisterForm';
import { AuthLayout } from '../components/layouts/AuthLayout';

/**
 * RegisterPage - Registration page component
 *
 * Displays the registration form within the authentication layout.
 * Redirects to verification page after successful registration.
 * Conditionally available based on VITE_REGISTRATION_ENABLED environment variable.
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const signUp = useSignUp();

  // check if registration is enabled
  const registrationEnabled = import.meta.env.VITE_REGISTRATION_ENABLED !== 'false';

  const handleSubmit = useCallback(
    (data: RegisterFormData) => {
      signUp.mutate(data, {
        onError: (error) => {
          toast.error(error.error.message);
        },
        onSuccess: () => {
          toast.success(AUTH_SUCCESS_MESSAGES.REGISTRATION_SUCCESS);
          // after successful registration, redirect to verification page
          navigate('/verify-email', { state: { email: data.email } });
        },
      });
    },
    [navigate, signUp]
  );

  // if registration is disabled, show message
  if (!registrationEnabled) {
    return (
      <AuthLayout>
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Registration Unavailable</h2>
          <p className="text-muted-foreground mt-4 text-sm">Registration is currently disabled.</p>
          <p className="text-muted-foreground mt-2 text-sm">Please contact the administrator for access.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Create an account</h2>
          <p className="text-muted-foreground mt-2 text-sm">Enter your details to get started</p>
        </div>

        <RegisterForm isSubmitting={signUp.isPending} onSubmit={handleSubmit} />
      </div>
    </AuthLayout>
  );
}
