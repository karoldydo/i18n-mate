import { CircleCheckIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { AuthLayout } from '../components/layouts/AuthLayout';

/**
 * EmailVerifiedPage
 *
 * React component displayed when the user returns from the email verification link.
 * Shows a confirmation message indicating their email address has been successfully verified.
 * Triggers a toast notification to confirm success and automatically redirects to the login page
 * after a short delay.
 *
 * @returns {JSX.Element} Email verification success UI and redirect logic.
 */
export function EmailVerifiedPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // show success toast on mount
    toast.success('Email verified successfully', {
      description: 'You can now log in to your account.',
    });

    // redirect to login page after 3 seconds
    const timer = setTimeout(() => {
      navigate('/login', { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
            <CircleCheckIcon className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold">Email verified!</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Your email address has been successfully verified. Redirecting to login...
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
