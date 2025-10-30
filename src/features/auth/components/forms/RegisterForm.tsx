import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { type RegisterFormData, registerFormSchema } from '../../api/auth.schemas';

interface RegisterFormProps {
  isSubmitting?: boolean;
  onSubmit: (data: RegisterFormData) => void;
}

/**
 * RegisterForm - Registration form component
 *
 * Provides email, password, and password confirmation input fields with validation.
 * Ensures passwords match and meet security requirements.
 */
export function RegisterForm({ isSubmitting = false, onSubmit }: RegisterFormProps) {
  const form = useForm<RegisterFormData>({
    defaultValues: {
      confirmPassword: '',
      email: '',
      password: '',
    },
    mode: 'onChange',
    resolver: zodResolver(registerFormSchema),
  });
  const { control, formState, handleSubmit: formHandleSubmit } = form;

  const handleSubmit = useCallback(
    (data: RegisterFormData) => {
      onSubmit(data);
    },
    [onSubmit]
  );

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={formHandleSubmit(handleSubmit)}>
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
                    autoComplete="new-password"
                    placeholder="Create a password"
                    type="password"
                  />
                </FormControl>
                <FormDescription>At least 8 characters with one letter and one digit</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    aria-invalid={!!formState.errors.confirmPassword}
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    type="password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button className="w-full" disabled={!formState.isValid || isSubmitting} type="submit">
          {isSubmitting ? 'Creating account...' : 'Sign up'}
        </Button>

        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{' '}
          <Link className="text-primary hover:text-primary/80 underline-offset-4 hover:underline" to="/login">
            Log in
          </Link>
        </p>
      </form>
    </Form>
  );
}
