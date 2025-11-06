import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createErrorBoundaryWrapper,
  createMockProjectLocale,
  createMockSupabaseClient,
  createMockSupabaseError,
  createMockSupabaseResponse,
  createTestWrapper,
  generateTestUuid,
} from '@/test/utils';

import { useProjectLocales } from './useProjectLocales';

// mock supabase client
const mockSupabase = createMockSupabaseClient({
  rpc: vi.fn(),
});

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => mockSupabase,
}));

describe('useProjectLocales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch project locales successfully', async () => {
    const projectId = generateTestUuid();
    const mockLocales = [
      createMockProjectLocale({
        is_default: true,
        label: 'English',
        locale: 'en',
        project_id: projectId,
      }),
      createMockProjectLocale({
        is_default: false,
        label: 'Spanish',
        locale: 'es',
        project_id: projectId,
      }),
    ];

    mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(mockLocales, null));

    const { result } = renderHook(() => useProjectLocales(projectId), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.rpc).toHaveBeenCalledWith('list_project_locales_with_default', {
      p_project_id: projectId,
    });
    expect(result.current.data).toEqual(mockLocales);
  });

  it('should handle validation error for invalid project ID', async () => {
    const invalidProjectId = 'invalid-uuid';

    const errorBoundary = { current: null };
    renderHook(() => useProjectLocales(invalidProjectId), {
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

  it('should handle database error', async () => {
    const mockError = createMockSupabaseError('Database connection error', 'PGRST301');

    mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null, mockError));

    const errorBoundary = { current: null };
    const projectId = generateTestUuid();

    renderHook(() => useProjectLocales(projectId), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeDefined());

    expect(errorBoundary.current).toMatchObject({
      data: null,
      error: {
        code: 500,
        details: { original: mockError },
        message: 'Failed to fetch project locales',
      },
    });
  });

  it('should handle no data returned from server', async () => {
    mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null, null));

    const errorBoundary = { current: null };
    const projectId = generateTestUuid();

    renderHook(() => useProjectLocales(projectId), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeDefined());

    expect(errorBoundary.current).toMatchObject({
      data: null,
      error: {
        code: 500,
        message: 'No data returned from server',
      },
    });
  });

  it('should handle invalid data format from server', async () => {
    // Mock invalid data that doesn't match the schema
    const mockInvalidData = [
      {
        created_at: '2025-01-15T10:00:00Z',
        id: generateTestUuid(),
        // Missing required fields for ProjectLocaleWithDefault
      },
    ];

    mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(mockInvalidData, null));

    const errorBoundary = { current: null };
    const projectId = generateTestUuid();

    renderHook(() => useProjectLocales(projectId), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeDefined());

    expect(errorBoundary.current).toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid_type',
        }),
      ]),
    });
  });

  it('should handle empty locales array', async () => {
    mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse([], null));

    const projectId = generateTestUuid();
    const { result } = renderHook(() => useProjectLocales(projectId), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should validate empty string as invalid UUID', async () => {
    const errorBoundary = { current: null };
    renderHook(() => useProjectLocales(''), {
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

  it('should fetch multiple locales with default marked correctly', async () => {
    const projectId = generateTestUuid();
    const mockLocales = [
      createMockProjectLocale({
        is_default: true,
        label: 'German',
        locale: 'de',
        project_id: projectId,
      }),
      createMockProjectLocale({
        is_default: false,
        label: 'French',
        locale: 'fr',
        project_id: projectId,
      }),
      createMockProjectLocale({
        is_default: false,
        label: 'Italian',
        locale: 'it',
        project_id: projectId,
      }),
    ];

    mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(mockLocales, null));

    const { result } = renderHook(() => useProjectLocales(projectId), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data?.[0].is_default).toBe(true);
    expect(result.current.data?.[1].is_default).toBe(false);
    expect(result.current.data?.[2].is_default).toBe(false);
  });
});
