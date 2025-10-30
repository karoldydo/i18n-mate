import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useAuth } from '@/app/providers/AuthProvider';

import { createAuthErrorResponse } from '../auth.errors';

/**
 * Resend verification email mutation hook
 *
 * Resends email verification to the current user.
 * Requires user to be in unverified state (user object exists but email_confirmed_at is null).
 *
 * @throws {ApiErrorResponse} 400 - No user email available
 * @throws {ApiErrorResponse} 429 - Rate limit exceeded
 * @throws {ApiErrorResponse} 500 - Server error
 *
 * @returns TanStack Query mutation hook for resending verification email
 */
export function useResendVerification() {
  const { resendVerification } = useAuth();

  return useMutation<undefined, ApiErrorResponse, undefined>({
    mutationFn: async () => {
      try {
        await resendVerification();
      } catch (error) {
        throw createAuthErrorResponse(error as never, 'useResendVerification', 'Failed to resend verification email');
      }
    },
  });
}
