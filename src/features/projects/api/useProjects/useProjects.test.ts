import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ListProjectsParams } from '@/shared/types';

import { PROJECTS_DEFAULT_LIMIT, PROJECTS_MAX_LIMIT } from '@/shared/constants/projects.constants';
import { createErrorBoundaryWrapper, createMockProjectWithCounts, createMockSupabaseError } from '@/test/utils';
import { createTestWrapper } from '@/test/utils/test-wrapper';

import { useProjects } from './useProjects';

// mock supabase client
const MOCK_SUPABASE = {
  rpc: vi.fn(),
};

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => MOCK_SUPABASE,
}));

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch projects with default params', async () => {
    const MOCK_SUPABASE_RESPONSE = [createMockProjectWithCounts()];

    MOCK_SUPABASE.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        count: 1,
        data: MOCK_SUPABASE_RESPONSE,
        error: null,
      }),
    });

    const { result } = renderHook(() => useProjects(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_SUPABASE.rpc).toHaveBeenCalledWith(
      'list_projects_with_counts',
      { p_limit: PROJECTS_DEFAULT_LIMIT, p_offset: 0 },
      expect.objectContaining({ count: 'exact' })
    );
    expect(result.current.data).toEqual({
      data: MOCK_SUPABASE_RESPONSE,
      metadata: {
        end: 0,
        start: 0,
        total: 1,
      },
    });
  });

  it('should fetch projects with custom pagination', async () => {
    const MOCK_SUPABASE_RESPONSE = [
      createMockProjectWithCounts({
        description: null,
        id: '550e8400-e29b-41d4-a716-446655440001',
        key_count: 5,
        locale_count: 1,
        name: 'Project 2',
        prefix: 'pr2',
      }),
    ];

    MOCK_SUPABASE.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        count: 50,
        data: MOCK_SUPABASE_RESPONSE,
        error: null,
      }),
    });

    const params: ListProjectsParams = {
      limit: 10,
      offset: 20,
    };

    const { result } = renderHook(() => useProjects(params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_SUPABASE.rpc).toHaveBeenCalledWith(
      'list_projects_with_counts',
      { p_limit: 10, p_offset: 20 },
      expect.objectContaining({ count: 'exact' })
    );
    expect(result.current.data).toEqual({
      data: MOCK_SUPABASE_RESPONSE,
      metadata: {
        end: 20,
        start: 20,
        total: 50,
      },
    });
  });

  it('should fetch projects with ascending name sort', async () => {
    const MOCK_SUPABASE_RESPONSE = [
      createMockProjectWithCounts({
        description: null,
        id: '550e8400-e29b-41d4-a716-446655440002',
        key_count: 0,
        locale_count: 1,
        name: 'A Project',
        prefix: 'apr',
      }),
    ];

    const orderMock = vi.fn().mockResolvedValue({
      count: 1,
      data: MOCK_SUPABASE_RESPONSE,
      error: null,
    });

    MOCK_SUPABASE.rpc.mockReturnValue({
      order: orderMock,
    });

    const params: ListProjectsParams = {
      order: 'name.asc',
    };

    const { result } = renderHook(() => useProjects(params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(orderMock).toHaveBeenCalledWith('name', { ascending: true });
    expect(result.current.data).toEqual({
      data: MOCK_SUPABASE_RESPONSE,
      metadata: {
        end: 0,
        start: 0,
        total: 1,
      },
    });
  });

  it('should fetch projects with descending created_at sort', async () => {
    const MOCK_SUPABASE_RESPONSE = [
      createMockProjectWithCounts({
        created_at: '2025-01-15T12:00:00Z',
        description: null,
        id: '550e8400-e29b-41d4-a716-446655440003',
        key_count: 0,
        locale_count: 1,
        name: 'Newest Project',
        prefix: 'new',
        updated_at: '2025-01-15T12:00:00Z',
      }),
    ];

    const orderMock = vi.fn().mockResolvedValue({
      count: 1,
      data: MOCK_SUPABASE_RESPONSE,
      error: null,
    });

    MOCK_SUPABASE.rpc.mockReturnValue({
      order: orderMock,
    });

    const params: ListProjectsParams = {
      order: 'created_at.desc',
    };

    const { result } = renderHook(() => useProjects(params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toEqual({
      data: MOCK_SUPABASE_RESPONSE,
      metadata: {
        end: 0,
        start: 0,
        total: 1,
      },
    });
  });

  it('should return empty array when no projects found', async () => {
    MOCK_SUPABASE.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        count: 0,
        data: [],
        error: null,
      }),
    });

    const { result } = renderHook(() => useProjects(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      data: [],
      metadata: {
        end: -1,
        start: 0,
        total: 0,
      },
    });
  });

  it('should handle database error', async () => {
    const MOCK_SUPABASE_ERROR = createMockSupabaseError('Database error', 'PGRST301');

    MOCK_SUPABASE.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: null,
        error: MOCK_SUPABASE_ERROR,
      }),
    });

    const errorBoundary = { current: null };
    renderHook(() => useProjects(), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeDefined());

    expect(errorBoundary.current).toMatchObject({
      error: {
        code: 500,
        message: 'Failed to fetch projects',
      },
    });
  });

  it('should validate limit max value', async () => {
    const params: ListProjectsParams = {
      limit: PROJECTS_MAX_LIMIT + 50, // over max
    };

    const errorBoundary = { current: null };
    renderHook(() => useProjects(params), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeDefined());

    expect(errorBoundary.current).toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: 'too_big',
          path: ['limit'],
        }),
      ]),
    });
  });

  it('should validate negative offset', async () => {
    const params: ListProjectsParams = {
      offset: -10,
    };

    const errorBoundary = { current: null };
    renderHook(() => useProjects(params), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeDefined());

    expect(errorBoundary.current).toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: 'too_small',
          path: ['offset'],
        }),
      ]),
    });
  });

  it('should return correct pagination metadata for multiple items', async () => {
    const MOCK_SUPABASE_RESPONSE = [
      createMockProjectWithCounts({
        description: 'Project 1',
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Project 1',
        prefix: 'pr1',
      }),
      createMockProjectWithCounts({
        created_at: '2025-01-15T11:00:00Z',
        description: 'Project 2',
        id: '550e8400-e29b-41d4-a716-446655440001',
        key_count: 5,
        locale_count: 1,
        name: 'Project 2',
        prefix: 'pr2',
        updated_at: '2025-01-15T11:00:00Z',
      }),
      createMockProjectWithCounts({
        created_at: '2025-01-15T12:00:00Z',
        description: 'Project 3',
        id: '550e8400-e29b-41d4-a716-446655440002',
        key_count: 15,
        locale_count: 3,
        name: 'Project 3',
        prefix: 'pr3',
        updated_at: '2025-01-15T12:00:00Z',
      }),
    ];

    MOCK_SUPABASE.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        count: 150,
        data: MOCK_SUPABASE_RESPONSE,
        error: null,
      }),
    });

    const params: ListProjectsParams = {
      limit: 3,
      offset: 50,
    };

    const { result } = renderHook(() => useProjects(params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.metadata).toEqual({
      end: 52,
      start: 50,
      total: 150,
    });
    expect(result.current.data?.data).toHaveLength(3);
  });

  it('should handle pagination metadata for last page', async () => {
    const MOCK_SUPABASE_RESPONSE = [
      createMockProjectWithCounts({
        description: 'Last Project',
        id: '550e8400-e29b-41d4-a716-446655440000',
        key_count: 1,
        locale_count: 1,
        name: 'Last Project',
        prefix: 'last',
      }),
    ];

    MOCK_SUPABASE.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        count: 26,
        data: MOCK_SUPABASE_RESPONSE,
        error: null,
      }),
    });

    const params: ListProjectsParams = {
      limit: 10,
      offset: 25,
    };

    const { result } = renderHook(() => useProjects(params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // last page with only 1 item (total 26, offset 25, returns 1 item)
    expect(result.current.data?.metadata).toEqual({
      end: 25,
      start: 25,
      total: 26,
    });
    expect(result.current.data?.data).toHaveLength(1);
  });
});
