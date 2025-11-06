import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ListProjectsParams } from '@/shared/types';

import { PROJECTS_DEFAULT_LIMIT, PROJECTS_MAX_LIMIT } from '@/shared/constants/projects.constants';
import { createErrorBoundaryWrapper, createMockProjectWithCounts, createMockSupabaseError } from '@/test/utils';
import { createTestWrapper } from '@/test/utils/test-wrapper';

import { useProjects } from './useProjects';

// mock supabase client
const mockSupabase = {
  rpc: vi.fn(),
};

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => mockSupabase,
}));

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch projects with default params', async () => {
    const mockSupabaseResponse = [createMockProjectWithCounts({ total_count: 1 })];

    mockSupabase.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: mockSupabaseResponse,
        error: null,
      }),
    });

    const { result } = renderHook(() => useProjects(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.rpc).toHaveBeenCalledWith('list_projects_with_counts', {
      p_limit: PROJECTS_DEFAULT_LIMIT,
      p_offset: 0,
    });
    expect(result.current.data).toEqual({
      data: mockSupabaseResponse,
      metadata: {
        end: 0,
        start: 0,
        total: 1,
      },
    });
  });

  it('should fetch projects with custom pagination', async () => {
    const mockSupabaseResponse = [
      createMockProjectWithCounts({
        description: null,
        id: '550e8400-e29b-41d4-a716-446655440001',
        key_count: 5,
        locale_count: 1,
        name: 'Project 2',
        prefix: 'pr2',
        total_count: 50,
      }),
    ];

    mockSupabase.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: mockSupabaseResponse,
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

    expect(mockSupabase.rpc).toHaveBeenCalledWith('list_projects_with_counts', { p_limit: 10, p_offset: 20 });
    expect(result.current.data).toEqual({
      data: mockSupabaseResponse,
      metadata: {
        end: 20,
        start: 20,
        total: 50,
      },
    });
  });

  it('should fetch projects with ascending name sort', async () => {
    const mockSupabaseResponse = [
      createMockProjectWithCounts({
        description: null,
        id: '550e8400-e29b-41d4-a716-446655440002',
        key_count: 0,
        locale_count: 1,
        name: 'A Project',
        prefix: 'apr',
        total_count: 1,
      }),
    ];

    const orderMock = vi.fn().mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    mockSupabase.rpc.mockReturnValue({
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
      data: mockSupabaseResponse,
      metadata: {
        end: 0,
        start: 0,
        total: 1,
      },
    });
  });

  it('should fetch projects with descending created_at sort', async () => {
    const mockSupabaseResponse = [
      createMockProjectWithCounts({
        created_at: '2025-01-15T12:00:00Z',
        description: null,
        id: '550e8400-e29b-41d4-a716-446655440003',
        key_count: 0,
        locale_count: 1,
        name: 'Newest Project',
        prefix: 'new',
        total_count: 1,
        updated_at: '2025-01-15T12:00:00Z',
      }),
    ];

    const orderMock = vi.fn().mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    mockSupabase.rpc.mockReturnValue({
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
      data: mockSupabaseResponse,
      metadata: {
        end: 0,
        start: 0,
        total: 1,
      },
    });
  });

  it('should return empty array when no projects found', async () => {
    mockSupabase.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
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
    const mockSupabaseError = createMockSupabaseError('Database error', 'PGRST301');

    mockSupabase.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: null,
        error: mockSupabaseError,
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
    const mockSupabaseResponse = [
      createMockProjectWithCounts({
        description: 'Project 1',
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Project 1',
        prefix: 'pr1',
        total_count: 150,
      }),
      createMockProjectWithCounts({
        created_at: '2025-01-15T11:00:00Z',
        description: 'Project 2',
        id: '550e8400-e29b-41d4-a716-446655440001',
        key_count: 5,
        locale_count: 1,
        name: 'Project 2',
        prefix: 'pr2',
        total_count: 150,
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
        total_count: 150,
        updated_at: '2025-01-15T12:00:00Z',
      }),
    ];

    mockSupabase.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: mockSupabaseResponse,
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
    const mockSupabaseResponse = [
      createMockProjectWithCounts({
        description: 'Last Project',
        id: '550e8400-e29b-41d4-a716-446655440000',
        key_count: 1,
        locale_count: 1,
        name: 'Last Project',
        prefix: 'last',
        total_count: 26,
      }),
    ];

    mockSupabase.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: mockSupabaseResponse,
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
