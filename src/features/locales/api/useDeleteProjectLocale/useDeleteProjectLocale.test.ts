import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeleteProjectLocale } from './useDeleteProjectLocale';

// mock supabase client
const mockSupabase = {
  from: vi.fn(),
};

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => mockSupabase,
}));

// create wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useDeleteProjectLocale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should delete a locale successfully', async () => {
    const mockDeleteResponse = {
      error: null,
    };

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockDeleteResponse),
      }),
    });

    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createWrapper(),
    });

    const localeId = '550e8400-e29b-41d4-a716-446655440000';

    // execute the mutation
    await result.current.mutateAsync(localeId);

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.from).toHaveBeenCalledWith('project_locales');
    expect(result.current.data).toBeUndefined();
  });

  it('should handle validation error for invalid UUID', async () => {
    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createWrapper(),
    });

    const invalidUuid = 'invalid-uuid';

    // execute the mutation and expect it to throw
    await expect(() => result.current.mutateAsync(invalidUuid)).rejects.toThrow();

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should handle database error during deletion', async () => {
    const mockError = {
      code: 'PGRST301',
      message: 'Database error during deletion',
    };

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: mockError,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createWrapper(),
    });

    const localeId = '550e8400-e29b-41d4-a716-446655440000';

    // execute the mutation and expect it to throw
    await expect(() => result.current.mutateAsync(localeId)).rejects.toThrow();

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should handle attempt to delete default locale', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: {
            code: 'PGRST301',
            message: 'Cannot delete default_locale',
          },
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createWrapper(),
    });

    const localeId = '550e8400-e29b-41d4-a716-446655440000';

    // execute the mutation and expect it to throw
    await expect(() => result.current.mutateAsync(localeId)).rejects.toThrow();

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isError).toBe(true));

    // check that the error is the expected one
    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 400,
        message: 'Cannot delete default locale',
      },
    });
  });

  it('should handle 404 error when locale not found', async () => {
    const mockError = {
      code: 'PGRST301',
      message: 'Record not found',
    };

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: mockError,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createWrapper(),
    });

    const localeId = '550e8400-e29b-41d4-a716-446655440000';

    // execute the mutation and expect it to throw
    await expect(() => result.current.mutateAsync(localeId)).rejects.toThrow();

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});
