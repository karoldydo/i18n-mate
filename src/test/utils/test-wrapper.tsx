import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

/**
 * Creates a reusable test wrapper with QueryClientProvider
 *
 * Usage:
 * ```ts
 * import { renderHook } from '@testing-library/react';
 * import { createTestWrapper } from '@/test/utils/test-wrapper';
 *
 * const { result } = renderHook(() => useMyHook(), {
 *   wrapper: createTestWrapper(),
 * });
 * ```
 *
 * @param options - Optional configuration for the QueryClient
 * @returns A wrapper component for testing
 */
export function createTestWrapper(options?: {
  queryClientConfig?: {
    defaultOptions?: {
      mutations?: Record<string, unknown>;
      queries?: Record<string, unknown>;
    };
  };
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
        ...options?.queryClientConfig?.defaultOptions?.mutations,
      },
      queries: {
        retry: false,
        ...options?.queryClientConfig?.defaultOptions?.queries,
      },
    },
  });

  const TestWrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  TestWrapper.displayName = 'TestWrapper';

  return TestWrapper;
}
