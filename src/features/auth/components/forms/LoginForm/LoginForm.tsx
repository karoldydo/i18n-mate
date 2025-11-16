import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { type LoginFormData, loginFormSchema } from '../../../api/auth.schemas';

interface LoginFormProps {
  isSubmitting?: boolean;
  onSubmit: (data: LoginFormData) => void;
  registrationEnabled?: boolean;
}

/**
 * LoginForm - Login form component
 *
 * Provides email and password input fields with validation.
 * Includes links to password reset and registration (if enabled).
 */
export function LoginForm({ isSubmitting = false, onSubmit, registrationEnabled = true }: LoginFormProps) {
  const form = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onChange',
    resolver: zodResolver(loginFormSchema),
  });
  const { control, formState, handleSubmit: formHandleSubmit } = form;

  const handleSubmit = useCallback(
    (data: LoginFormData) => {
      onSubmit(data);
    },
    [onSubmit]
  );

  return (
    <Form {...form}>
      <form className="space-y-6" data-testid="login-form" onSubmit={formHandleSubmit(handleSubmit)}>
        <div className="space-y-4">
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    aria-invalid={!!formState.errors.email}
                    autoComplete="email"
                    data-testid="login-email-input"
                    placeholder="you@example.com"
                    type="email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    aria-invalid={!!formState.errors.password}
                    autoComplete="current-password"
                    data-testid="login-password-input"
                    placeholder="Enter your password"
                    type="password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-end">
          <Link
            className="text-primary hover:text-primary/80 text-sm underline-offset-4 hover:underline"
            to="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          className="w-full"
          data-testid="login-submit-button"
          disabled={!formState.isValid || isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Logging in...' : 'Log in'}
        </Button>

        {registrationEnabled && (
          <p className="text-muted-foreground text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link className="text-primary hover:text-primary/80 underline-offset-4 hover:underline" to="/register">
              Sign up
            </Link>
          </p>
        )}
      </form>
    </Form>
  );
}
