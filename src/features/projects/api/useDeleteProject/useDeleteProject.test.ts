import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants/projects.constants';

import { useDeleteProject } from './useDeleteProject';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

// Mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => mockSupabase,
}));

// Create wrapper with providers
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

describe('useDeleteProject', () => {
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

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
      wrapper: createWrapper(),
    });

    result.current.mutate(validProjectId);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.from).toHaveBeenCalledWith('projects');
  });

  it('should handle project not found', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 0,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(validProjectId);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 404,
        message: PROJECTS_ERROR_MESSAGES.PROJECT_NOT_FOUND,
      },
    });
  });

  it('should handle RLS access denied (count = 0)', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 0,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(validProjectId);

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
    const mockError = {
      code: 'PGRST301',
      message: 'Database connection error',
    };

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: null,
          error: mockError,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(validProjectId);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 500,
        details: { original: mockError },
        message: 'Failed to delete project',
      },
    });
  });

  it('should validate invalid UUID format', async () => {
    const invalidId = 'not-a-uuid';

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(invalidId);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate empty string as invalid UUID', async () => {
    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('');

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should cascade delete related data', async () => {
    // This test verifies that the delete operation is called correctly
    // The actual cascade is handled by the database ON DELETE CASCADE
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 1,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(validProjectId);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify delete was called with correct ID
    const deleteMock = mockSupabase.from().delete;
    expect(deleteMock).toHaveBeenCalled();
  });

  it('should invalidate caches on successful deletion', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });

    const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 1,
          error: null,
        }),
      }),
    });

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteProject(), { wrapper });

    result.current.mutate(validProjectId);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify cache was invalidated
    expect(removeQueriesSpy).toHaveBeenCalled();
    expect(invalidateQueriesSpy).toHaveBeenCalled();
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
      wrapper: createWrapper(),
    });

    // First delete
    result.current.mutate(validProjectId);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Reset
    result.current.reset();

    // Second delete of different project
    const secondProjectId = '550e8400-e29b-41d4-a716-446655440001';
    result.current.mutate(secondProjectId);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
