import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LOCALE_ERROR_MESSAGES } from '@/shared/constants';
import { createMockSupabaseError, generateTestUuid } from '@/test/utils/test-data';
import { createMockSupabaseClient } from '@/test/utils/test-helpers';
import { createTestWrapper } from '@/test/utils/test-wrapper';

import { useDeleteProjectLocale } from './useDeleteProjectLocale';

// mock supabase client
const mockSupabase = createMockSupabaseClient();

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => mockSupabase,
}));

describe('useDeleteProjectLocale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should delete a locale successfully', async () => {
    const mockSupabaseResponse = {
      error: null,
    };

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockSupabaseResponse),
      }),
    });

    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createTestWrapper(),
    });

    const localeId = generateTestUuid();

    // execute the mutation
    await result.current.mutateAsync(localeId);

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.from).toHaveBeenCalledWith('project_locales');
    expect(result.current.data).toBeUndefined();
  });

  it('should handle validation error for invalid UUID', async () => {
    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createTestWrapper(),
    });

    const invalidUuid = 'invalid-uuid';

    // execute the mutation and expect it to throw
    await expect(() => result.current.mutateAsync(invalidUuid)).rejects.toThrow();

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should handle database error during deletion', async () => {
    const mockSupabaseError = createMockSupabaseError('Database error during deletion', 'PGRST301');

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: mockSupabaseError,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createTestWrapper(),
    });

    const localeId = generateTestUuid();

    // execute the mutation and expect it to throw
    await expect(() => result.current.mutateAsync(localeId)).rejects.toThrow();

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.error.message).toBe('Failed to delete locale');
  });

  it('should handle attempt to delete default locale', async () => {
    const mockSupabaseError = createMockSupabaseError(LOCALE_ERROR_MESSAGES.LOCALE_CANNOT_DELETE_MESSAGE, 'PGRST301');

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: mockSupabaseError,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createTestWrapper(),
    });

    const localeId = generateTestUuid();

    // execute the mutation and expect it to throw
    await expect(() => result.current.mutateAsync(localeId)).rejects.toThrow();

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
    const mockSupabaseError = createMockSupabaseError('Record not found', 'PGRST301');

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: mockSupabaseError,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProjectLocale(), {
      wrapper: createTestWrapper(),
    });

    const localeId = generateTestUuid();

    // execute the mutation and expect it to throw
    await expect(() => result.current.mutateAsync(localeId)).rejects.toThrow();

    // wait for mutation to complete
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.error.message).toBe('Failed to delete locale');
  });
});
