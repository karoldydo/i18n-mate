import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { type ResetPasswordFormData, resetPasswordFormSchema } from '../../api/auth.schemas';

interface ResetPasswordFormProps {
  isSubmitting?: boolean;
  onSubmit: (data: ResetPasswordFormData) => void;
}

/**
 * ResetPasswordForm - Password reset form component
 *
 * Provides password and password confirmation input fields for setting a new password.
 * Used after clicking the reset link from email.
 */
export function ResetPasswordForm({ isSubmitting = false, onSubmit }: ResetPasswordFormProps) {
  const form = useForm<ResetPasswordFormData>({
    defaultValues: {
      confirmPassword: '',
      password: '',
    },
    mode: 'onChange',
    resolver: zodResolver(resetPasswordFormSchema),
  });
  const { control, formState, handleSubmit: formHandleSubmit } = form;

  const handleSubmit = useCallback(
    (data: ResetPasswordFormData) => {
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    aria-invalid={!!formState.errors.password}
                    autoComplete="new-password"
                    placeholder="Create a new password"
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
                    placeholder="Confirm your new password"
                    type="password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button className="w-full" disabled={!formState.isValid || isSubmitting} type="submit">
          {isSubmitting ? 'Resetting password...' : 'Set new password'}
        </Button>
      </form>
    </Form>
  );
}
