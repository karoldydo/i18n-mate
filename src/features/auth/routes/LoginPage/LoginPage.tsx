import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { useConfig } from '@/app/providers/ConfigProvider';

import type { LoginFormData } from '../../api/auth.schemas';

import { useSignIn } from '../../api/useSignIn';
import { LoginForm } from '../../components/forms/LoginForm';
import { AuthLayout } from '../../components/layouts/AuthLayout';

/**
 * LoginPage - Login page component
 *
 * Displays the login form within the authentication layout.
 * Redirects to intended page or projects list after successful login.
 *
 * @returns {JSX.Element} Login page component
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useSignIn();
  const { config } = useConfig();

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

  const { registrationEnabled } = useMemo(
    () => ({ registrationEnabled: config?.registrationEnabled ?? false }),
    [config]
  );

  return (
    <AuthLayout>
      <div className="space-y-6" data-testid="login-page">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="text-muted-foreground mt-2 text-sm">Sign in to your account to continue</p>
        </div>

        <LoginForm isSubmitting={signIn.isPending} onSubmit={handleSubmit} registrationEnabled={registrationEnabled} />
      </div>
    </AuthLayout>
  );
}
