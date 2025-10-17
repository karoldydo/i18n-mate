import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateProjectWithDefaultLocaleRequest } from '@/shared/types';

import { useCreateProject } from './useCreateProject';

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

describe('useCreateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should create project successfully', async () => {
    const mockData = {
      created_at: '2025-01-15T10:00:00Z',
      default_locale: 'en',
      description: 'Test project',
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Project',
      owner_user_id: 'user-123',
      prefix: 'test',
      updated_at: '2025-01-15T10:00:00Z',
    };

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      }),
    });

    const projectData: CreateProjectWithDefaultLocaleRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      description: 'Test project',
      name: 'Test Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_project_with_default_locale', {
      p_default_locale: 'en',
      p_default_locale_label: 'English',
      p_description: 'Test project',
      p_name: 'Test Project',
      p_prefix: 'test',
    });
    // Runtime validation filters out owner_user_id (not in ProjectResponse type)
    expect(result.current.data).toEqual({
      created_at: '2025-01-15T10:00:00Z',
      default_locale: 'en',
      description: 'Test project',
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Project',
      prefix: 'test',
      updated_at: '2025-01-15T10:00:00Z',
    });
  });

  it('should create project with null description', async () => {
    const mockData = {
      created_at: '2025-01-15T10:00:00Z',
      default_locale: 'en',
      description: null,
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Minimal Project',
      owner_user_id: 'user-123',
      prefix: 'min',
      updated_at: '2025-01-15T10:00:00Z',
    };

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      }),
    });

    const projectData: CreateProjectWithDefaultLocaleRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Minimal Project',
      prefix: 'min',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_project_with_default_locale', {
      p_default_locale: 'en',
      p_default_locale_label: 'English',
      p_description: undefined,
      p_name: 'Minimal Project',
      p_prefix: 'min',
    });
  });

  it('should handle duplicate name conflict', async () => {
    const mockError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "projects_name_unique_per_owner"',
    };

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const projectData: CreateProjectWithDefaultLocaleRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Existing Project',
      prefix: 'new',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 409,
        message: 'Project with this name already exists',
      },
    });
  });

  it('should handle duplicate prefix conflict', async () => {
    const mockError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "projects_prefix_unique_per_owner"',
    };

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const projectData: CreateProjectWithDefaultLocaleRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'New Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 409,
        message: 'Prefix is already in use',
      },
    });
  });

  it('should validate invalid prefix (too short)', async () => {
    const projectData: CreateProjectWithDefaultLocaleRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test',
      prefix: 'a', // Only 1 character
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate invalid prefix (too long)', async () => {
    const projectData: CreateProjectWithDefaultLocaleRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test',
      prefix: 'toolong', // 7 characters
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate invalid prefix (ends with dot)', async () => {
    const projectData: CreateProjectWithDefaultLocaleRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test',
      prefix: 'app.',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate invalid locale code format', async () => {
    const projectData: CreateProjectWithDefaultLocaleRequest = {
      default_locale: 'invalid',
      default_locale_label: 'Invalid',
      name: 'Test',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should accept valid BCP-47 locale codes', async () => {
    const mockData = {
      created_at: '2025-01-15T10:00:00Z',
      default_locale: 'en-US',
      description: null,
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'US Project',
      owner_user_id: 'user-123',
      prefix: 'usp',
      updated_at: '2025-01-15T10:00:00Z',
    };

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      }),
    });

    const projectData: CreateProjectWithDefaultLocaleRequest = {
      default_locale: 'en-US',
      default_locale_label: 'English (US)',
      name: 'US Project',
      prefix: 'usp',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Runtime validation filters out owner_user_id
    expect(result.current.data).toEqual({
      created_at: '2025-01-15T10:00:00Z',
      default_locale: 'en-US',
      description: null,
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'US Project',
      prefix: 'usp',
      updated_at: '2025-01-15T10:00:00Z',
    });
  });

  it('should handle generic database error', async () => {
    const mockError = {
      code: 'PGRST301',
      message: 'Database error',
    };

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const projectData: CreateProjectWithDefaultLocaleRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 500,
        details: { original: mockError },
        message: 'Failed to create project',
      },
    });
  });
});
