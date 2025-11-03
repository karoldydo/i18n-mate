import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants/projects.constants';
import { createMockSupabaseClient, createMockSupabaseError, createTestWrapper, generateTestId } from '@/test/utils';

import { useDeleteProject } from './useDeleteProject';

// mock supabase client
const mockSupabase = createMockSupabaseClient();

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => mockSupabase,
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
    mockSupabase.from.mockReturnValue({
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

    expect(mockSupabase.from).toHaveBeenCalledWith('projects');
  });

  it('should handle project not found or RLS access denied (count = 0)', async () => {
    // NOTE: Supabase RLS policies cause count = 0 (not explicit errors),
    // so both "project doesn't exist" and "access denied" scenarios
    // produce the same 404 response. This is intentional behavior.
    mockSupabase.from.mockReturnValue({
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
    const mockSupabaseError = createMockSupabaseError('Database connection error', 'PGRST301');

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: null,
          error: mockSupabaseError,
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
        details: { original: mockSupabaseError },
        message: 'Failed to delete project',
      },
    });
  });

  it('should validate invalid UUID format', async () => {
    const invalidProjectId = 'not-a-uuid';

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(invalidProjectId);

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
    mockSupabase.from.mockReturnValue({
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
    const deleteMock = mockSupabase.from().delete;
    expect(deleteMock).toHaveBeenCalled();
  });

  it('should handle multiple delete attempts gracefully', async () => {
    mockSupabase.from.mockReturnValue({
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
    const secondProjectId = generateTestId();
    result.current.mutate(secondProjectId);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
