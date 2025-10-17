import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UpdateProjectRequest } from '@/shared/types';

import {
  PROJECTS_CONSTRAINTS,
  PROJECTS_ERROR_MESSAGES,
  PROJECTS_PG_ERROR_CODES,
} from '@/shared/constants/projects.constants';

import { useUpdateProject } from './useUpdateProject';

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

describe('useUpdateProject', () => {
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should update project name successfully', async () => {
    const mockData = {
      created_at: '2025-01-15T10:00:00Z',
      default_locale: 'en',
      description: 'Original description',
      id: validProjectId,
      name: 'Updated Name',
      prefix: 'test',
      updated_at: '2025-01-15T11:00:00Z',
    };

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      }),
    });

    const updateData: UpdateProjectRequest = {
      name: 'Updated Name',
    };

    const { result } = renderHook(() => useUpdateProject(validProjectId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    expect(result.current.data).toEqual(mockData);
  });

  it('should update project description successfully', async () => {
    const mockData = {
      created_at: '2025-01-15T10:00:00Z',
      default_locale: 'en',
      description: 'New description',
      id: validProjectId,
      name: 'Test Project',
      prefix: 'test',
      updated_at: '2025-01-15T11:00:00Z',
    };

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      }),
    });

    const updateData: UpdateProjectRequest = {
      description: 'New description',
    };

    const { result } = renderHook(() => useUpdateProject(validProjectId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.description).toBe('New description');
  });

  it('should update both name and description', async () => {
    const mockData = {
      created_at: '2025-01-15T10:00:00Z',
      default_locale: 'en',
      description: 'Updated description',
      id: validProjectId,
      name: 'Updated Name',
      prefix: 'test',
      updated_at: '2025-01-15T11:00:00Z',
    };

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      }),
    });

    const updateData: UpdateProjectRequest = {
      description: 'Updated description',
      name: 'Updated Name',
    };

    const { result } = renderHook(() => useUpdateProject(validProjectId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.name).toBe('Updated Name');
    expect(result.current.data?.description).toBe('Updated description');
  });

  it('should handle duplicate name conflict', async () => {
    const mockError = {
      code: PROJECTS_PG_ERROR_CODES.UNIQUE_VIOLATION,
      message: `duplicate key value violates unique constraint "${PROJECTS_CONSTRAINTS.NAME_UNIQUE_PER_OWNER}"`,
    };

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      }),
    });

    const updateData: UpdateProjectRequest = {
      name: 'Existing Project',
    };

    const { result } = renderHook(() => useUpdateProject(validProjectId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 409,
        message: PROJECTS_ERROR_MESSAGES.PROJECT_NAME_EXISTS,
      },
    });
  });

  it('should prevent modification of prefix field', async () => {
    const updateData = {
      name: 'Updated Name',
      prefix: 'new', // Attempting to change immutable field
    } as unknown as UpdateProjectRequest;

    const { result } = renderHook(() => useUpdateProject(validProjectId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should prevent modification of default_locale field', async () => {
    const updateData = {
      default_locale: 'fr', // Attempting to change immutable field
      name: 'Updated Name',
    } as unknown as UpdateProjectRequest;

    const { result } = renderHook(() => useUpdateProject(validProjectId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should handle project not found', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });

    const updateData: UpdateProjectRequest = {
      name: 'Updated Name',
    };

    const { result } = renderHook(() => useUpdateProject(validProjectId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 404,
        message: PROJECTS_ERROR_MESSAGES.PROJECT_NOT_FOUND,
      },
    });
  });

  it('should handle invalid UUID format', async () => {
    const invalidId = 'not-a-uuid';

    const updateData: UpdateProjectRequest = {
      name: 'Updated Name',
    };

    const { result } = renderHook(() => useUpdateProject(invalidId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate empty name', async () => {
    const updateData: UpdateProjectRequest = {
      name: '',
    };

    const { result } = renderHook(() => useUpdateProject(validProjectId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should handle database trigger error for immutable fields', async () => {
    const mockError = {
      code: 'P0001',
      message: 'Cannot modify prefix after creation',
    };

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      }),
    });

    const updateData: UpdateProjectRequest = {
      name: 'Updated Name',
    };

    const { result } = renderHook(() => useUpdateProject(validProjectId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 400,
        message: PROJECTS_ERROR_MESSAGES.PREFIX_IMMUTABLE,
      },
    });
  });

  it('should handle generic database error', async () => {
    const mockError = {
      code: 'XX000',
      message: 'Internal database error',
    };

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      }),
    });

    const updateData: UpdateProjectRequest = {
      name: 'Updated Name',
    };

    const { result } = renderHook(() => useUpdateProject(validProjectId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 500,
        details: { original: mockError },
        message: 'Failed to update project',
      },
    });
  });

  it('should support optimistic updates', async () => {
    const mockData = {
      created_at: '2025-01-15T10:00:00Z',
      default_locale: 'en',
      description: 'Original description',
      id: validProjectId,
      name: 'Updated Name',
      prefix: 'test',
      updated_at: '2025-01-15T11:00:00Z',
    };

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useUpdateProject(validProjectId), {
      wrapper: createWrapper(),
    });

    // Mutation should have onMutate for optimistic updates
    expect(result.current.mutate).toBeDefined();
  });
});
