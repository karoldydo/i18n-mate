import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useAuth } from '@/app/providers/AuthProvider';

import type { ResetPasswordFormData } from '../auth.schemas';

import { createAuthErrorResponse } from '../auth.errors';

/**
 * Update password mutation hook
 *
 * Updates the user's password after clicking reset link from email.
 * Requires valid reset token in URL (handled by Supabase automatically).
 *
 * @throws {ApiErrorResponse} 400 - Invalid password format
 * @throws {ApiErrorResponse} 401 - Token expired or invalid
 * @throws {ApiErrorResponse} 500 - Server error
 *
 * @returns TanStack Query mutation hook for password update
 */
export function useUpdatePassword() {
  const { updatePassword } = useAuth();

  return useMutation<undefined, ApiErrorResponse, ResetPasswordFormData>({
    mutationFn: async (payload) => {
      try {
        await updatePassword(payload.password);
      } catch (error) {
        throw createAuthErrorResponse(error as never, 'useUpdatePassword', 'Failed to update password');
      }
    },
  });
}
