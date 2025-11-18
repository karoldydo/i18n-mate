import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useAuth } from '@/app/providers/AuthProvider';

import type { ForgotPasswordFormData } from '../auth.schemas';

import { createAuthErrorResponse } from '../auth.errors';

/**
 * Reset password mutation hook
 *
 * Sends a password reset email to the user.
 * Email contains a link to reset password page with token.
 *
 * @throws {ApiErrorResponse} 400 - Invalid email format
 * @throws {ApiErrorResponse} 429 - Rate limit exceeded
 * @throws {ApiErrorResponse} 500 - Server error
 *
 * @returns {ReturnType<typeof useMutation<undefined, ApiErrorResponse, ForgotPasswordFormData>>} TanStack Query mutation hook for password reset request
 */
export function useResetPassword() {
  const { resetPassword } = useAuth();

  return useMutation<undefined, ApiErrorResponse, ForgotPasswordFormData>({
    mutationFn: async (payload) => {
      try {
        await resetPassword(payload.email);
      } catch (error) {
        throw createAuthErrorResponse(error as never, 'useResetPassword', 'Failed to send reset email');
      }
    },
  });
}
