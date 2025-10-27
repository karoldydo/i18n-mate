import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProjectLocaleWithDefault } from '@/shared/types';

import { useProjectLocales } from './useProjectLocales';

// mock supabase client
const mockSupabase = {
  rpc: vi.fn(),
};

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => mockSupabase,
}));

// create wrapper with providers
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

describe('useProjectLocales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch project locales successfully', async () => {
    const mockData: ProjectLocaleWithDefault[] = [
      {
        created_at: '2025-01-15T10:00:00Z',
        id: '550e8400-e29b-41d4-a716-446655440000',
        is_default: true,
        label: 'English',
        locale: 'en',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        updated_at: '2025-01-15T10:00:00Z',
      },
      {
        created_at: '2025-01-15T10:00:00Z',
        id: '550e8400-e29b-41d4-a716-446655440001',
        is_default: false,
        label: 'Spanish',
        locale: 'es',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        updated_at: '2025-01-15T10:00:00Z',
      },
    ];

    // Mock the rpc method to return the correct structure
    mockSupabase.rpc.mockImplementation(async () => {
      // Simulate the actual async behavior of the hook
      return {
        data: mockData,
        error: null,
      };
    });

    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const { result } = renderHook(() => useProjectLocales(projectId), {
      wrapper: createWrapper(),
    });

    // Wait for the query to complete
    await waitFor(() => {
      // Check if we have a success state or error state
      if (result.current.isSuccess) {
        expect(result.current.isSuccess).toBe(true);
      } else if (result.current.isError) {
        // If there's an error, we should not be in success state
        expect(result.current.isError).toBe(true);
      } else {
        // If neither, we might need to wait longer or there's an issue
        expect.fail('Query did not reach success or error state');
      }
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('list_project_locales_with_default', { p_project_id: projectId });
    expect(result.current.data).toEqual(mockData);
  });

  it('should handle validation error for invalid project ID', async () => {
    const projectId = 'invalid-uuid';
    const { result } = renderHook(() => useProjectLocales(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it('should handle database error', async () => {
    const mockError = {
      code: 'PGRST301',
      message: 'Database error',
    };

    mockSupabase.rpc.mockImplementation(async () => {
      return {
        data: null,
        error: mockError,
      };
    });

    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const { result } = renderHook(() => useProjectLocales(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should handle no data returned from server', async () => {
    mockSupabase.rpc.mockImplementation(async () => {
      return {
        data: null,
        error: null,
      };
    });

    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const { result } = renderHook(() => useProjectLocales(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should handle invalid data format from server', async () => {
    // Mock invalid data that doesn't match the schema
    const mockInvalidData = [
      {
        created_at: '2025-01-15T10:00:00Z',
        id: '550e8400-e29b-41d4-a716-446655440000',
        // Missing required fields for ProjectLocaleWithDefault
      },
    ];

    mockSupabase.rpc.mockImplementation(async () => {
      return {
        data: mockInvalidData,
        error: null,
      };
    });

    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const { result } = renderHook(() => useProjectLocales(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});
