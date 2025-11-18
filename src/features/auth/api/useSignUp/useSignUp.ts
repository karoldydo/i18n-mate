import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useAuth } from '@/app/providers/AuthProvider';

import type { RegisterFormData } from '../auth.schemas';

import { createAuthErrorResponse } from '../auth.errors';

/**
 * Sign up mutation hook
 *
 * Creates a new user account with email and password.
 * Automatically signs out after registration to enforce email verification requirement.
 * User must verify email before logging in.
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid email/password format)
 * @throws {ApiErrorResponse} 409 - Email already in use
 * @throws {ApiErrorResponse} 500 - Server error
 *
 * @returns {ReturnType<typeof useMutation<undefined, ApiErrorResponse, RegisterFormData>>} TanStack Query mutation hook for user registration
 */
export function useSignUp() {
  const { signUp } = useAuth();

  return useMutation<undefined, ApiErrorResponse, RegisterFormData>({
    mutationFn: async (payload) => {
      try {
        await signUp(payload.email, payload.password);
      } catch (error) {
        throw createAuthErrorResponse(error as never, 'useSignUp', 'Failed to create account');
      }
    },
  });
}
