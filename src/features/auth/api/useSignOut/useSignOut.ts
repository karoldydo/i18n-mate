import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useAuth } from '@/app/providers/AuthProvider';

import { createAuthErrorResponse } from '../auth.errors';

/**
 * Sign out mutation hook
 *
 * Logs out the current user and clears the session.
 *
 * @throws {ApiErrorResponse} 500 - Server error
 *
 * @returns TanStack Query mutation hook for user logout
 */
export function useSignOut() {
  const { signOut } = useAuth();

  return useMutation<undefined, ApiErrorResponse, undefined>({
    mutationFn: async () => {
      try {
        await signOut();
      } catch (error) {
        throw createAuthErrorResponse(error as never, 'useSignOut', 'Failed to sign out');
      }
    },
  });
}
