import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LOCALE_ERROR_MESSAGES } from '@/shared/constants';
import { createMockSupabaseError, generateTestUuid } from '@/test/utils/test-data';
import { createMockSupabaseClient } from '@/test/utils/test-helpers';
import { createTestWrapper } from '@/test/utils/test-wrapper';

import { useDeleteProjectLocale } from './useDeleteProjectLocale';

// mock supabase client
const MOCK_SUPABASE = createMockSupabaseClient();

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => MOCK_SUPABASE,
}));

describe('useDeleteProjectLocale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should delete a locale successfully', async () => {
    const MOCK_SUPABASE_RESPONSE = {
      error: null,
    };

    MOCK_SUPABASE.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(MOCK_SUPABASE_RESPONSE),
      }),
    });

    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createTestWrapper(),
    });

    const LOCALE_ID = generateTestUuid();

    // execute the mutation
    await result.current.mutateAsync(LOCALE_ID);

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_SUPABASE.from).toHaveBeenCalledWith('project_locales');
    expect(result.current.data).toBeUndefined();
  });

  it('should handle validation error for invalid UUID', async () => {
    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createTestWrapper(),
    });

    const INVALID_UUID = 'invalid-uuid';

    // execute the mutation and expect it to throw
    await expect(() => result.current.mutateAsync(INVALID_UUID)).rejects.toThrow();

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should handle database error during deletion', async () => {
    const MOCK_SUPABASE_ERROR = createMockSupabaseError('Database error during deletion', 'PGRST301');

    MOCK_SUPABASE.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: MOCK_SUPABASE_ERROR,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createTestWrapper(),
    });

    const LOCALE_ID = generateTestUuid();

    // execute the mutation and expect it to throw
    await expect(() => result.current.mutateAsync(LOCALE_ID)).rejects.toThrow();

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.error.message).toBe('Failed to delete locale');
  });

  it('should handle attempt to delete default locale', async () => {
    const MOCK_SUPABASE_ERROR = createMockSupabaseError(LOCALE_ERROR_MESSAGES.LOCALE_CANNOT_DELETE_MESSAGE, 'PGRST301');

    MOCK_SUPABASE.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: MOCK_SUPABASE_ERROR,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createTestWrapper(),
    });

    const LOCALE_ID = generateTestUuid();

    // execute the mutation and expect it to throw
    await expect(() => result.current.mutateAsync(LOCALE_ID)).rejects.toThrow();

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isError).toBe(true));

    // check that the error is the expected one
    expect(result.current.error).toMatchObject({
      data: null,
      error: {
        code: 400,
        message: LOCALE_ERROR_MESSAGES.DEFAULT_LOCALE_CANNOT_DELETE,
      },
    });
  });

  it('should handle 404 error when locale not found', async () => {
    const MOCK_SUPABASE_ERROR = createMockSupabaseError('Record not found', 'PGRST301');

    MOCK_SUPABASE.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: MOCK_SUPABASE_ERROR,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createTestWrapper(),
    });

    const LOCALE_ID = generateTestUuid();

    // execute the mutation and expect it to throw
    await expect(() => result.current.mutateAsync(LOCALE_ID)).rejects.toThrow();

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.error.message).toBe('Failed to delete locale');
  });
});
