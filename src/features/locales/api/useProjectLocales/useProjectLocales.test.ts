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
const MOCK_SUPABASE = createMockSupabaseClient({
  rpc: vi.fn(),
});

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => MOCK_SUPABASE,
}));

describe('useProjectLocales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch project locales successfully', async () => {
    const PROJECT_ID = generateTestUuid();
    const MOCK_LOCALES = [
      createMockProjectLocale({
        is_default: true,
        label: 'English',
        locale: 'en',
        project_id: PROJECT_ID,
      }),
      createMockProjectLocale({
        is_default: false,
        label: 'Spanish',
        locale: 'es',
        project_id: PROJECT_ID,
      }),
    ];

    MOCK_SUPABASE.rpc.mockResolvedValue(createMockSupabaseResponse(MOCK_LOCALES, null));

    const { result } = renderHook(() => useProjectLocales(PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_SUPABASE.rpc).toHaveBeenCalledWith('list_project_locales_with_default', {
      p_project_id: PROJECT_ID,
    });
    expect(result.current.data).toEqual(MOCK_LOCALES);
  });

  it('should handle validation error for invalid project ID', async () => {
    const INVALID_PROJECT_ID = 'invalid-uuid';

    const errorBoundary = { current: null };
    renderHook(() => useProjectLocales(INVALID_PROJECT_ID), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeDefined());

    expect(errorBoundary.current).toMatchObject({
      issues: [
        {
          code: 'invalid_string',
          message: 'Invalid project ID format',
          validation: 'uuid',
        },
      ],
    });
  });

  it('should handle database error', async () => {
    const MOCK_ERROR = createMockSupabaseError('Database connection error', 'PGRST301');

    MOCK_SUPABASE.rpc.mockResolvedValue(createMockSupabaseResponse(null, MOCK_ERROR));

    const errorBoundary = { current: null };
    const PROJECT_ID = generateTestUuid();

    renderHook(() => useProjectLocales(PROJECT_ID), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeDefined());

    expect(errorBoundary.current).toMatchObject({
      data: null,
      error: {
        code: 500,
        details: { original: MOCK_ERROR },
        message: 'Failed to fetch project locales',
      },
    });
  });

  it('should handle no data returned from server', async () => {
    MOCK_SUPABASE.rpc.mockResolvedValue(createMockSupabaseResponse(null, null));

    const errorBoundary = { current: null };
    const PROJECT_ID = generateTestUuid();

    renderHook(() => useProjectLocales(PROJECT_ID), {
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
    const MOCK_INVALID_DATA = [
      {
        created_at: '2025-01-15T10:00:00Z',
        id: generateTestUuid(),
        // Missing required fields for ProjectLocaleWithDefault
      },
    ];

    MOCK_SUPABASE.rpc.mockResolvedValue(createMockSupabaseResponse(MOCK_INVALID_DATA, null));

    const errorBoundary = { current: null };
    const PROJECT_ID = generateTestUuid();

    renderHook(() => useProjectLocales(PROJECT_ID), {
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
    MOCK_SUPABASE.rpc.mockResolvedValue(createMockSupabaseResponse([], null));

    const PROJECT_ID = generateTestUuid();
    const { result } = renderHook(() => useProjectLocales(PROJECT_ID), {
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
          message: 'Invalid project ID format',
          validation: 'uuid',
        },
      ],
    });
  });

  it('should fetch multiple locales with default marked correctly', async () => {
    const PROJECT_ID = generateTestUuid();
    const MOCK_LOCALES = [
      createMockProjectLocale({
        is_default: true,
        label: 'German',
        locale: 'de',
        project_id: PROJECT_ID,
      }),
      createMockProjectLocale({
        is_default: false,
        label: 'French',
        locale: 'fr',
        project_id: PROJECT_ID,
      }),
      createMockProjectLocale({
        is_default: false,
        label: 'Italian',
        locale: 'it',
        project_id: PROJECT_ID,
      }),
    ];

    MOCK_SUPABASE.rpc.mockResolvedValue(createMockSupabaseResponse(MOCK_LOCALES, null));

    const { result } = renderHook(() => useProjectLocales(PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data?.[0].is_default).toBe(true);
    expect(result.current.data?.[1].is_default).toBe(false);
    expect(result.current.data?.[2].is_default).toBe(false);
  });
});
