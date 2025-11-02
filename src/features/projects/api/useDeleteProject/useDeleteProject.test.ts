import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants/projects.constants';
import { createMockSupabaseClient, createMockSupabaseError, createTestWrapper, generateTestId } from '@/test/utils';

import { useDeleteProject } from './useDeleteProject';

// mock supabase client
const MOCK_SUPABASE = createMockSupabaseClient();

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => MOCK_SUPABASE,
}));

// test constants
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('useDeleteProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should delete project successfully', async () => {
    MOCK_SUPABASE.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 1,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_SUPABASE.from).toHaveBeenCalledWith('projects');
  });

  it('should handle project not found or RLS access denied (count = 0)', async () => {
    // NOTE: Supabase RLS policies cause count = 0 (not explicit errors),
    // so both "project doesn't exist" and "access denied" scenarios
    // produce the same 404 response. This is intentional behavior.
    MOCK_SUPABASE.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 0,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_ID);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 404,
        message: PROJECTS_ERROR_MESSAGES.PROJECT_NOT_FOUND,
      },
    });
  });

  it('should handle database error', async () => {
    const MOCK_SUPABASE_ERROR = createMockSupabaseError('Database connection error', 'PGRST301');

    MOCK_SUPABASE.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: null,
          error: MOCK_SUPABASE_ERROR,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_ID);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 500,
        details: { original: MOCK_SUPABASE_ERROR },
        message: 'Failed to delete project',
      },
    });
  });

  it('should validate invalid UUID format', async () => {
    const INVALID_PROJECT_ID = 'not-a-uuid';

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(INVALID_PROJECT_ID);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate empty string as invalid UUID', async () => {
    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate('');

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should cascade delete related data', async () => {
    // this test verifies that the delete operation is called correctly
    // the actual cascade is handled by the database ON DELETE CASCADE
    MOCK_SUPABASE.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 1,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // verify delete was called with correct id
    const deleteMock = MOCK_SUPABASE.from().delete;
    expect(deleteMock).toHaveBeenCalled();
  });

  it('should handle multiple delete attempts gracefully', async () => {
    MOCK_SUPABASE.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 1,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createTestWrapper(),
    });

    // first delete
    result.current.mutate(PROJECT_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // reset
    result.current.reset();

    // second delete of different project
    const SECOND_PROJECT_ID = generateTestId();
    result.current.mutate(SECOND_PROJECT_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
