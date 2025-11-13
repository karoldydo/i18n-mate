import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useAuth } from '@/app/providers/AuthProvider';

import { createAuthErrorResponse } from '../auth.errors';

/**
 * Resend verification email mutation hook
 *
 * Resends email verification to the provided email or current user.
 * Can be used even when user is not logged in (e.g., after registration).
 *
 * @param email - Optional email address. If not provided, uses current user's email.
 *
 * @throws {ApiErrorResponse} 400 - No user email available
 * @throws {ApiErrorResponse} 429 - Rate limit exceeded
 * @throws {ApiErrorResponse} 500 - Server error
 *
 * @returns TanStack Query mutation hook for resending verification email
 */
export function useResendVerification() {
  const { resendVerification } = useAuth();

  return useMutation<undefined, ApiErrorResponse, string | undefined>({
    mutationFn: async (email?: string) => {
      try {
        await resendVerification(email);
      } catch (error) {
        throw createAuthErrorResponse(error as never, 'useResendVerification', 'Failed to resend verification email');
      }
    },
  });
}
