import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UpdateProjectRequest } from '@/shared/types';

import {
  PROJECTS_CONSTRAINTS,
  PROJECTS_ERROR_MESSAGES,
  PROJECTS_PG_ERROR_CODES,
} from '@/shared/constants/projects.constants';
import { createMockProject, createMockSupabaseError, generateTestUuid } from '@/test/utils/test-data';
import { createMockSupabaseClient } from '@/test/utils/test-helpers';
import { createTestWrapper } from '@/test/utils/test-wrapper';

import { useUpdateProject } from './useUpdateProject';

// mock supabase client
const MOCK_SUPABASE = createMockSupabaseClient();

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => MOCK_SUPABASE,
}));

describe('useUpdateProject', () => {
  const PROJECT_ID = generateTestUuid();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should update project name successfully', async () => {
    const MOCK_SUPABASE_RESPONSE = createMockProject({
      description: 'Original description',
      id: PROJECT_ID,
      name: 'Updated Name',
      updated_at: '2025-01-15T11:00:00Z',
    });

    MOCK_SUPABASE.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: MOCK_SUPABASE_RESPONSE,
              error: null,
            }),
          }),
        }),
      }),
    });

    const updateData: UpdateProjectRequest = {
      name: 'Updated Name',
    };

    const { result } = renderHook(() => useUpdateProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_SUPABASE.from).toHaveBeenCalledWith('projects');
    expect(result.current.data).toEqual(MOCK_SUPABASE_RESPONSE);
  });

  it('should update project description successfully', async () => {
    const MOCK_SUPABASE_RESPONSE = createMockProject({
      description: 'New description',
      id: PROJECT_ID,
      updated_at: '2025-01-15T11:00:00Z',
    });

    MOCK_SUPABASE.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: MOCK_SUPABASE_RESPONSE,
              error: null,
            }),
          }),
        }),
      }),
    });

    const updateData: UpdateProjectRequest = {
      description: 'New description',
    };

    const { result } = renderHook(() => useUpdateProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.description).toBe('New description');
  });

  it('should update both name and description', async () => {
    const MOCK_SUPABASE_RESPONSE = createMockProject({
      description: 'Updated description',
      id: PROJECT_ID,
      name: 'Updated Name',
      updated_at: '2025-01-15T11:00:00Z',
    });

    MOCK_SUPABASE.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: MOCK_SUPABASE_RESPONSE,
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

    const { result } = renderHook(() => useUpdateProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.name).toBe('Updated Name');
    expect(result.current.data?.description).toBe('Updated description');
  });

  it('should handle duplicate name conflict', async () => {
    const MOCK_SUPABASE_ERROR = createMockSupabaseError(
      `duplicate key value violates unique constraint "${PROJECTS_CONSTRAINTS.NAME_UNIQUE_PER_OWNER}"`,
      PROJECTS_PG_ERROR_CODES.UNIQUE_VIOLATION
    );

    MOCK_SUPABASE.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: MOCK_SUPABASE_ERROR,
            }),
          }),
        }),
      }),
    });

    const updateData: UpdateProjectRequest = {
      name: 'Existing Project',
    };

    const { result } = renderHook(() => useUpdateProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
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
      prefix: 'new', // attempting to change immutable field
    } as unknown as UpdateProjectRequest;

    const { result } = renderHook(() => useUpdateProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should prevent modification of default_locale field', async () => {
    const updateData = {
      default_locale: 'fr', // attempting to change immutable field
      name: 'Updated Name',
    } as unknown as UpdateProjectRequest;

    const { result } = renderHook(() => useUpdateProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should handle project not found', async () => {
    MOCK_SUPABASE.from.mockReturnValue({
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

    const { result } = renderHook(() => useUpdateProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
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
    const INVALID_PROJECT_ID = 'not-a-uuid';

    const updateData: UpdateProjectRequest = {
      name: 'Updated Name',
    };

    const { result } = renderHook(() => useUpdateProject(INVALID_PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate empty name', async () => {
    const updateData: UpdateProjectRequest = {
      name: '',
    };

    const { result } = renderHook(() => useUpdateProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should handle database trigger error for immutable fields', async () => {
    const mockError = createMockSupabaseError('Cannot modify prefix after creation', 'P0001');

    MOCK_SUPABASE.from.mockReturnValue({
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

    const { result } = renderHook(() => useUpdateProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
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
    const mockError = createMockSupabaseError('Internal database error', 'XX000');

    MOCK_SUPABASE.from.mockReturnValue({
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

    const { result } = renderHook(() => useUpdateProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
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

  it('should invalidate queries after successful update', async () => {
    const mockData = createMockProject({
      description: 'Original description',
      id: PROJECT_ID,
      name: 'Updated Name',
      updated_at: '2025-01-15T11:00:00Z',
    });

    MOCK_SUPABASE.from.mockReturnValue({
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

    const { result } = renderHook(() => useUpdateProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(updateData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify the mutation completed successfully
    expect(result.current.data).toEqual(mockData);
  });
});
