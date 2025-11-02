import type { RenderOptions } from '@testing-library/react';

import { render } from '@testing-library/react';
import { Component, createElement, type ReactNode } from 'react';
import { vi } from 'vitest';

import { createTestWrapper } from './test-wrapper';

/**
 * Error boundary component for testing useSuspenseQuery hooks
 *
 * This component catches errors thrown by Suspense queries and stores them
 * in state, allowing tests to assert on error conditions.
 *
 * Usage:
 * ```ts
 * import { renderHook } from '@testing-library/react';
 * import { createErrorBoundaryWrapper } from '@/test/utils/test-helpers';
 *
 * const errorBoundary = { current: null };
 * const { result } = renderHook(() => useProject('invalid-id'), {
 *   wrapper: createErrorBoundaryWrapper(errorBoundary),
 * });
 *
 * await waitFor(() => expect(errorBoundary.current).toBeDefined());
 * expect(errorBoundary.current).toMatchObject({ message: 'Invalid UUID format' });
 * ```
 */
class TestErrorBoundary extends Component<
  { children: ReactNode; onError: (error: unknown) => void },
  { error: unknown; hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: (error: unknown) => void }) {
    super(props);
    this.state = { error: null, hasError: false };
  }

  static getDerivedStateFromError(error: unknown) {
    return { error, hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

/**
 * Creates a wrapper with ErrorBoundary and QueryClient for testing useSuspenseQuery hooks
 *
 * This wrapper combines the test QueryClient with an error boundary to catch
 * errors thrown by Suspense queries.
 *
 * Usage:
 * ```ts
 * import { renderHook } from '@testing-library/react';
 * import { createErrorBoundaryWrapper } from '@/test/utils/test-helpers';
 *
 * const errorBoundary = { current: null };
 * const { result } = renderHook(() => useProject('invalid-id'), {
 *   wrapper: createErrorBoundaryWrapper(errorBoundary),
 * });
 *
 * await waitFor(() => expect(errorBoundary.current).toBeDefined());
 * ```
 *
 * @param errorRef - A ref object to store caught errors
 * @returns A wrapper component with ErrorBoundary and QueryClient
 */
export function createErrorBoundaryWrapper(errorRef: { current: unknown }) {
  const TestWrapper = createTestWrapper();

  return ({ children }: { children: ReactNode }) =>
    createElement(
      TestWrapper,
      null,
      createElement(TestErrorBoundary, { children, onError: (error) => (errorRef.current = error) })
    );
}

/**
 * Creates a mock Supabase client for testing
 *
 * Usage:
 * ```ts
 * import { createMockSupabaseClient } from '@/test/utils/test-helpers';
 *
 * const mockClient = createMockSupabaseClient({
 *   from: vi.fn().mockReturnValue({
 *     select: vi.fn().mockResolvedValue({ data: [], error: null }),
 *   }),
 * });
 * ```
 *
 * @param overrides - Optional overrides for specific methods
 * @returns A mock Supabase client
 */
export function createMockSupabaseClient<T extends Record<string, unknown> = Record<string, unknown>>(overrides?: T) {
  return {
    auth: {
      getSession: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
    ...overrides,
  } as typeof overrides & {
    auth: {
      getSession: ReturnType<typeof vi.fn>;
      signIn: ReturnType<typeof vi.fn>;
      signOut: ReturnType<typeof vi.fn>;
      signUp: ReturnType<typeof vi.fn>;
    };
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  };
}

/**
 * Custom render function that includes all providers
 *
 * Usage:
 * ```ts
 * import { renderWithProviders } from '@/test/utils/test-helpers';
 *
 * const { getByRole } = renderWithProviders(<MyComponent />);
 * ```
 *
 * @param ui - The component to render
 * @param options - Optional render options
 * @returns The render result from @testing-library/react
 */
export function renderWithProviders(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    wrapper: createTestWrapper(),
    ...options,
  });
}

/**
 * Waits for a specified amount of time
 *
 * Usage:
 * ```ts
 * await waitFor(1000); // Wait 1 second
 * ```
 *
 * @param ms - Milliseconds to wait
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
