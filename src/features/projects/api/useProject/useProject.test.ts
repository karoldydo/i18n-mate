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
const mockSupabase = createMockSupabaseClient();

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => mockSupabase,
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
    const mockSupabaseResponse = createMockProject({
      id: PROJECT_ID,
      key_count: 5,
      locale_count: 3,
    });

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockSupabaseResponse, null)),
    });

    const { result } = renderHook(() => useProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_project_with_counts', { p_project_id: PROJECT_ID });
    expect(result.current.data).toEqual(mockSupabaseResponse);
  });

  it('should handle project not found', async () => {
    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, null)),
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
    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, null)),
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
    const mockSupabaseError = createMockSupabaseError('Database connection error', 'PGRST301');

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockSupabaseError)),
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
        details: { original: mockSupabaseError },
        message: 'Failed to fetch project',
      },
    });
  });

  it('should validate invalid UUID format', async () => {
    const invalidProjectId = 'not-a-uuid';

    const errorBoundary = { current: null };
    renderHook(() => useProject(invalidProjectId), {
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
    const mockProject = createMockProject({
      description: null,
      id: PROJECT_ID,
      key_count: 0,
      locale_count: 1,
    });

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockProject, null)),
    });

    const { result } = renderHook(() => useProject(PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.description).toBeNull();
  });
});
