import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useAuth } from '@/app/providers/AuthProvider';

import type { LoginFormData } from '../auth.schemas';

import { createAuthErrorResponse } from '../auth.errors';

/**
 * Sign in mutation hook
 *
 * Authenticates user with email and password.
 * Session is created only if email is verified.
 *
 * @throws {ApiErrorResponse} 401 - Invalid credentials
 * @throws {ApiErrorResponse} 403 - Email not confirmed
 * @throws {ApiErrorResponse} 500 - Server error
 *
 * @returns {ReturnType<typeof useMutation<undefined, ApiErrorResponse, LoginFormData>>} TanStack Query mutation hook for user login
 */
export function useSignIn() {
  const { signIn } = useAuth();

  return useMutation<undefined, ApiErrorResponse, LoginFormData>({
    mutationFn: async (payload) => {
      try {
        await signIn(payload.email, payload.password);
      } catch (error) {
        throw createAuthErrorResponse(error as never, 'useSignIn', 'Failed to sign in');
      }
    },
  });
}
