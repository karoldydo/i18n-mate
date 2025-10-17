import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ListProjectsParams } from '@/shared/types';

import { PROJECTS_DEFAULT_LIMIT, PROJECTS_MAX_LIMIT } from '@/shared/constants/projects.constants';

import { useProjects } from './useProjects';

// Mock Supabase client
const mockSupabase = {
  rpc: vi.fn(),
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

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch projects with default params', async () => {
    const mockData = [
      {
        created_at: '2025-01-15T10:00:00Z',
        default_locale: 'en',
        description: 'Test project',
        id: '550e8400-e29b-41d4-a716-446655440000',
        key_count: 10,
        locale_count: 2,
        name: 'Test Project',
        prefix: 'test',
        updated_at: '2025-01-15T10:00:00Z',
      },
    ];

    mockSupabase.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        count: 1,
        data: mockData,
        error: null,
      }),
    });

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'list_projects_with_counts',
      { p_limit: PROJECTS_DEFAULT_LIMIT, p_offset: 0 },
      expect.objectContaining({ count: 'exact' })
    );
    expect(result.current.data).toEqual({
      data: mockData,
      metadata: {
        end: 0,
        start: 0,
        total: 1,
      },
    });
  });

  it('should fetch projects with custom pagination', async () => {
    const mockData = [
      {
        created_at: '2025-01-15T10:00:00Z',
        default_locale: 'en',
        description: null,
        id: '550e8400-e29b-41d4-a716-446655440001',
        key_count: 5,
        locale_count: 1,
        name: 'Project 2',
        prefix: 'pr2',
        updated_at: '2025-01-15T10:00:00Z',
      },
    ];

    mockSupabase.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        count: 50,
        data: mockData,
        error: null,
      }),
    });

    const params: ListProjectsParams = {
      limit: 10,
      offset: 20,
    };

    const { result } = renderHook(() => useProjects(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'list_projects_with_counts',
      { p_limit: 10, p_offset: 20 },
      expect.objectContaining({ count: 'exact' })
    );
    expect(result.current.data).toEqual({
      data: mockData,
      metadata: {
        end: 20,
        start: 20,
        total: 50,
      },
    });
  });

  it('should fetch projects with ascending name sort', async () => {
    const mockData = [
      {
        created_at: '2025-01-15T10:00:00Z',
        default_locale: 'en',
        description: null,
        id: '550e8400-e29b-41d4-a716-446655440002',
        key_count: 0,
        locale_count: 1,
        name: 'A Project',
        prefix: 'apr',
        updated_at: '2025-01-15T10:00:00Z',
      },
    ];

    const orderMock = vi.fn().mockResolvedValue({
      count: 1,
      data: mockData,
      error: null,
    });

    mockSupabase.rpc.mockReturnValue({
      order: orderMock,
    });

    const params: ListProjectsParams = {
      order: 'name.asc',
    };

    const { result } = renderHook(() => useProjects(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(orderMock).toHaveBeenCalledWith('name', { ascending: true });
    expect(result.current.data).toEqual({
      data: mockData,
      metadata: {
        end: 0,
        start: 0,
        total: 1,
      },
    });
  });

  it('should fetch projects with descending created_at sort', async () => {
    const mockData = [
      {
        created_at: '2025-01-15T12:00:00Z',
        default_locale: 'en',
        description: null,
        id: '550e8400-e29b-41d4-a716-446655440003',
        key_count: 0,
        locale_count: 1,
        name: 'Newest Project',
        prefix: 'new',
        updated_at: '2025-01-15T12:00:00Z',
      },
    ];

    const orderMock = vi.fn().mockResolvedValue({
      count: 1,
      data: mockData,
      error: null,
    });

    mockSupabase.rpc.mockReturnValue({
      order: orderMock,
    });

    const params: ListProjectsParams = {
      order: 'created_at.desc',
    };

    const { result } = renderHook(() => useProjects(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toEqual({
      data: mockData,
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
        count: 0,
        data: [],
        error: null,
      }),
    });

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
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
    const mockError = {
      code: 'PGRST301',
      message: 'Database error',
    };

    mockSupabase.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 500,
        details: { original: mockError },
        message: 'Failed to fetch projects',
      },
    });
  });

  it('should validate limit max value', async () => {
    const params: ListProjectsParams = {
      limit: PROJECTS_MAX_LIMIT + 50, // Over max
    };

    const { result } = renderHook(() => useProjects(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate negative offset', async () => {
    const params: ListProjectsParams = {
      offset: -10,
    };

    const { result } = renderHook(() => useProjects(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should return correct pagination metadata for multiple items', async () => {
    const mockData = [
      {
        created_at: '2025-01-15T10:00:00Z',
        default_locale: 'en',
        description: 'Project 1',
        id: '550e8400-e29b-41d4-a716-446655440000',
        key_count: 10,
        locale_count: 2,
        name: 'Project 1',
        prefix: 'pr1',
        updated_at: '2025-01-15T10:00:00Z',
      },
      {
        created_at: '2025-01-15T11:00:00Z',
        default_locale: 'en',
        description: 'Project 2',
        id: '550e8400-e29b-41d4-a716-446655440001',
        key_count: 5,
        locale_count: 1,
        name: 'Project 2',
        prefix: 'pr2',
        updated_at: '2025-01-15T11:00:00Z',
      },
      {
        created_at: '2025-01-15T12:00:00Z',
        default_locale: 'en',
        description: 'Project 3',
        id: '550e8400-e29b-41d4-a716-446655440002',
        key_count: 15,
        locale_count: 3,
        name: 'Project 3',
        prefix: 'pr3',
        updated_at: '2025-01-15T12:00:00Z',
      },
    ];

    mockSupabase.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        count: 150,
        data: mockData,
        error: null,
      }),
    });

    const params: ListProjectsParams = {
      limit: 3,
      offset: 50,
    };

    const { result } = renderHook(() => useProjects(params), {
      wrapper: createWrapper(),
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
    const mockData = [
      {
        created_at: '2025-01-15T10:00:00Z',
        default_locale: 'en',
        description: 'Last Project',
        id: '550e8400-e29b-41d4-a716-446655440000',
        key_count: 1,
        locale_count: 1,
        name: 'Last Project',
        prefix: 'last',
        updated_at: '2025-01-15T10:00:00Z',
      },
    ];

    mockSupabase.rpc.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        count: 26,
        data: mockData,
        error: null,
      }),
    });

    const params: ListProjectsParams = {
      limit: 10,
      offset: 25,
    };

    const { result } = renderHook(() => useProjects(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Last page with only 1 item (total 26, offset 25, returns 1 item)
    expect(result.current.data?.metadata).toEqual({
      end: 25,
      start: 25,
      total: 26,
    });
    expect(result.current.data?.data).toHaveLength(1);
  });
});
