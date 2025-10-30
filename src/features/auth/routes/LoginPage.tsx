import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';

import type { LoginFormData } from '../api/auth.schemas';

import { useSignIn } from '../api';
import { LoginForm } from '../components/forms/LoginForm';
import { AuthLayout } from '../components/layouts/AuthLayout';

/**
 * LoginPage - Login page component
 *
 * Displays the login form within the authentication layout.
 * Redirects to intended page or projects list after successful login.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useSignIn();

  // read registration enabled from environment variable
  const registrationEnabled = import.meta.env.VITE_REGISTRATION_ENABLED !== 'false';

  const handleSubmit = useCallback(
    (data: LoginFormData) => {
      signIn.mutate(data, {
        onError: (error) => {
          toast.error(error.error.message);
        },
        onSuccess: () => {
          // redirect to intended page or default to projects
          const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/projects';
          navigate(from, { replace: true });
        },
      });
    },
    [location.state, navigate, signIn]
  );

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="text-muted-foreground mt-2 text-sm">Sign in to your account to continue</p>
        </div>

        <LoginForm isSubmitting={signIn.isPending} onSubmit={handleSubmit} registrationEnabled={registrationEnabled} />
      </div>
    </AuthLayout>
  );
}
