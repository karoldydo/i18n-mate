import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { type ForgotPasswordFormData, forgotPasswordFormSchema } from '../../api/auth.schemas';

interface ForgotPasswordFormProps {
  isSubmitting?: boolean;
  onSubmit: (data: ForgotPasswordFormData) => void;
}

/**
 * ForgotPasswordForm - Password reset request form component
 *
 * Provides an email input field to request a password reset link.
 */
export function ForgotPasswordForm({ isSubmitting = false, onSubmit }: ForgotPasswordFormProps) {
  const form = useForm<ForgotPasswordFormData>({
    defaultValues: {
      email: '',
    },
    mode: 'onChange',
    resolver: zodResolver(forgotPasswordFormSchema),
  });
  const { control, formState, handleSubmit: formHandleSubmit } = form;

  const handleSubmit = useCallback(
    (data: ForgotPasswordFormData) => {
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
                <FormDescription>
                  Enter your email address and we&apos;ll send you a link to reset your password
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button className="w-full" disabled={!formState.isValid || isSubmitting} type="submit">
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </Button>

        <p className="text-muted-foreground text-center text-sm">
          <Link className="text-primary hover:text-primary/80 underline-offset-4 hover:underline" to="/login">
            Back to login
          </Link>
        </p>
      </form>
    </Form>
  );
}
