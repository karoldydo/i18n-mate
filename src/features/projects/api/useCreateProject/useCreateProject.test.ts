import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateProjectRequest } from '@/shared/types';

import {
  PROJECTS_CONSTRAINTS,
  PROJECTS_ERROR_MESSAGES,
  PROJECTS_PG_ERROR_CODES,
} from '@/shared/constants/projects.constants';
import { createMockSupabaseError, createMockSupabaseResponse, createTestWrapper } from '@/test/utils';

import { useCreateProject } from './useCreateProject';

// mock supabase client
const mockSupabase = {
  rpc: vi.fn(),
};

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => mockSupabase,
}));

// shared test constants for consistent ids and timestamps
const TEST_TIMESTAMP = '2025-01-01T00:00:00Z';
const TEST_USER_ID = 'test-user-123';

describe('useCreateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should create project successfully', async () => {
    const mockSupabaseResponse = {
      created_at: TEST_TIMESTAMP,
      default_locale: 'en',
      description: 'Test project',
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Project',
      owner_user_id: TEST_USER_ID,
      prefix: 'test',
      updated_at: TEST_TIMESTAMP,
    };

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockSupabaseResponse, null)),
    });

    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      description: 'Test project',
      name: 'Test Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
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
    // runtime validation filters out owner_user_id (not in project response type)
    expect(result.current.data).toMatchObject({
      created_at: TEST_TIMESTAMP,
      default_locale: 'en',
      description: 'Test project',
      name: 'Test Project',
      prefix: 'test',
      updated_at: TEST_TIMESTAMP,
    });
    expect(result.current.data?.id).toBeDefined();
  });

  it('should create project with null description', async () => {
    const mockSupabaseResponse = {
      created_at: TEST_TIMESTAMP,
      default_locale: 'en',
      description: null,
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Minimal Project',
      owner_user_id: TEST_USER_ID,
      prefix: 'min',
      updated_at: TEST_TIMESTAMP,
    };

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockSupabaseResponse, null)),
    });

    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Minimal Project',
      prefix: 'min',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
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
    const mockSupabaseError = createMockSupabaseError(
      `duplicate key value violates unique constraint "${PROJECTS_CONSTRAINTS.NAME_UNIQUE_PER_OWNER}"`,
      PROJECTS_PG_ERROR_CODES.UNIQUE_VIOLATION
    );

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockSupabaseError)),
    });

    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Existing Project',
      prefix: 'new',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 409,
        message: PROJECTS_ERROR_MESSAGES.PROJECT_NAME_EXISTS,
      },
    });
  });

  it('should handle duplicate prefix conflict', async () => {
    const mockSupabaseError = createMockSupabaseError(
      `duplicate key value violates unique constraint "${PROJECTS_CONSTRAINTS.PREFIX_UNIQUE_PER_OWNER}"`,
      PROJECTS_PG_ERROR_CODES.UNIQUE_VIOLATION
    );

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockSupabaseError)),
    });

    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'New Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 409,
        message: PROJECTS_ERROR_MESSAGES.PREFIX_ALREADY_IN_USE,
      },
    });
  });

  it('should validate invalid prefix (too short)', async () => {
    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test',
      prefix: 'a', // only 1 character
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate invalid prefix (too long)', async () => {
    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test',
      prefix: 'toolong', // 7 characters
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate invalid prefix (ends with dot)', async () => {
    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test',
      prefix: 'app.',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate invalid locale code format', async () => {
    const projectData: CreateProjectRequest = {
      default_locale: 'invalid',
      default_locale_label: 'Invalid',
      name: 'Test',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should accept valid BCP-47 locale codes', async () => {
    const mockSupabaseResponse = {
      created_at: TEST_TIMESTAMP,
      default_locale: 'en-US',
      description: null,
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'US Project',
      owner_user_id: TEST_USER_ID,
      prefix: 'usp',
      updated_at: TEST_TIMESTAMP,
    };

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockSupabaseResponse, null)),
    });

    const projectData: CreateProjectRequest = {
      default_locale: 'en-US',
      default_locale_label: 'English (US)',
      name: 'US Project',
      prefix: 'usp',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // runtime validation filters out owner_user_id
    expect(result.current.data).toMatchObject({
      created_at: TEST_TIMESTAMP,
      default_locale: 'en-US',
      description: null,
      name: 'US Project',
      prefix: 'usp',
      updated_at: TEST_TIMESTAMP,
    });
    expect(result.current.data?.id).toBeDefined();
  });

  it('should handle generic database error', async () => {
    const mockSupabaseError = createMockSupabaseError('Database error', 'PGRST301');

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockSupabaseError)),
    });

    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 500,
        details: { original: mockSupabaseError },
        message: 'Failed to create project',
      },
    });
  });

  it('should handle no data returned from database', async () => {
    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, null)),
    });

    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 500,
        message: PROJECTS_ERROR_MESSAGES.NO_DATA_RETURNED,
      },
    });
  });

  it('should handle network error when RPC call fails', async () => {
    const networkError = new Error('Network request failed');
    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockRejectedValue(networkError),
    });

    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it('should validate maximum name length', async () => {
    const longName = 'a'.repeat(256); // exceeds max length

    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: longName,
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate empty name', async () => {
    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: '',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate locale label minimum length', async () => {
    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: '', // empty label
      name: 'Test Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate locale label maximum length', async () => {
    const longLabel = 'a'.repeat(256); // exceeds max length

    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: longLabel,
      name: 'Test Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate prefix with uppercase letters', async () => {
    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test Project',
      prefix: 'TEST', // uppercase not allowed
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate prefix with special characters', async () => {
    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test Project',
      prefix: 'te$t', // special characters not allowed
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should accept valid two-letter locale code', async () => {
    const mockSupabaseResponse = {
      created_at: TEST_TIMESTAMP,
      default_locale: 'zh',
      description: null,
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Chinese Project',
      owner_user_id: TEST_USER_ID,
      prefix: 'zh',
      updated_at: TEST_TIMESTAMP,
    };

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockSupabaseResponse, null)),
    });

    const projectData: CreateProjectRequest = {
      default_locale: 'zh',
      default_locale_label: 'Chinese',
      name: 'Chinese Project',
      prefix: 'zh',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.default_locale).toBe('zh');
  });

  it('should trim whitespace from name and description', async () => {
    const mockSupabaseResponse = {
      created_at: TEST_TIMESTAMP,
      default_locale: 'en',
      description: 'Trimmed description',
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Trimmed Project',
      owner_user_id: TEST_USER_ID,
      prefix: 'trim',
      updated_at: TEST_TIMESTAMP,
    };

    mockSupabase.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockSupabaseResponse, null)),
    });

    const projectData: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      description: '  Trimmed description  ',
      name: '  Trimmed Project  ',
      prefix: 'trim',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(projectData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_project_with_default_locale', {
      p_default_locale: 'en',
      p_default_locale_label: 'English',
      p_description: 'Trimmed description',
      p_name: 'Trimmed Project',
      p_prefix: 'trim',
    });
  });
});
