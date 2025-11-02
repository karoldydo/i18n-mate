import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants/projects.constants';
import {
  createErrorBoundaryWrapper,
  createMockProject,
  createMockSupabaseClient,
  createMockSupabaseError,
  createMockSupabaseResponse,
  createTestWrapper,
  generateTestUuid,
} from '@/test/utils';

import { useProject } from './useProject';

// mock supabase client
const MOCK_SUPABASE = createMockSupabaseClient();

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => MOCK_SUPABASE,
}));

describe('useProject', () => {
  const PROJECT_ID = generateTestUuid();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch project successfully', async () => {
    const MOCK_SUPABASE_RESPONSE = createMockProject({
      id: PROJECT_ID,
    });

    MOCK_SUPABASE.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(MOCK_SUPABASE_RESPONSE, null)),
        }),
      }),
    });

    const { result } = renderHook(() => useProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_SUPABASE.from).toHaveBeenCalledWith('projects');
    expect(result.current.data).toEqual(MOCK_SUPABASE_RESPONSE);
  });

  it('should handle project not found', async () => {
    MOCK_SUPABASE.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, null)),
        }),
      }),
    });

    const errorBoundary = { current: null };
    renderHook(() => useProject(PROJECT_ID), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeDefined());

    expect(errorBoundary.current).toMatchObject({
      data: null,
      error: {
        code: 404,
        message: PROJECTS_ERROR_MESSAGES.PROJECT_NOT_FOUND,
      },
    });
  });

  it('should handle RLS access denied (appears as not found)', async () => {
    MOCK_SUPABASE.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, null)),
        }),
      }),
    });

    const errorBoundary = { current: null };
    renderHook(() => useProject(PROJECT_ID), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeDefined());

    expect(errorBoundary.current).toMatchObject({
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
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, MOCK_SUPABASE_ERROR)),
        }),
      }),
    });

    const errorBoundary = { current: null };
    renderHook(() => useProject(PROJECT_ID), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeDefined());

    expect(errorBoundary.current).toMatchObject({
      data: null,
      error: {
        code: 500,
        details: { original: MOCK_SUPABASE_ERROR },
        message: 'Failed to fetch project',
      },
    });
  });

  it('should validate invalid UUID format', async () => {
    const INVALID_PROJECT_ID = 'not-a-uuid';

    const errorBoundary = { current: null };
    renderHook(() => useProject(INVALID_PROJECT_ID), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeDefined());

    expect(errorBoundary.current).toMatchObject({
      issues: [
        {
          code: 'invalid_string',
          message: 'Invalid UUID format',
          validation: 'uuid',
        },
      ],
    });
  });

  it('should validate empty string as invalid UUID', async () => {
    const errorBoundary = { current: null };
    renderHook(() => useProject(''), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeDefined());

    expect(errorBoundary.current).toMatchObject({
      issues: [
        {
          code: 'invalid_string',
          message: 'Invalid UUID format',
          validation: 'uuid',
        },
      ],
    });
  });

  it('should fetch project with null description', async () => {
    const mockData = createMockProject({
      description: null,
      id: PROJECT_ID,
    });

    MOCK_SUPABASE.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockData, null)),
        }),
      }),
    });

    const { result } = renderHook(() => useProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.description).toBeNull();
  });
});
