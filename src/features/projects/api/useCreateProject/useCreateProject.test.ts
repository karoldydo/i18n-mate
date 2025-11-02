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
const MOCK_SUPABASE = {
  rpc: vi.fn(),
};

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => MOCK_SUPABASE,
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
    const MOCK_SUPABASE_RESPONSE = {
      created_at: TEST_TIMESTAMP,
      default_locale: 'en',
      description: 'Test project',
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Project',
      owner_user_id: TEST_USER_ID,
      prefix: 'test',
      updated_at: TEST_TIMESTAMP,
    };

    MOCK_SUPABASE.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(MOCK_SUPABASE_RESPONSE, null)),
    });

    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      description: 'Test project',
      name: 'Test Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_SUPABASE.rpc).toHaveBeenCalledWith('create_project_with_default_locale', {
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
    const MOCK_SUPABASE_RESPONSE = {
      created_at: TEST_TIMESTAMP,
      default_locale: 'en',
      description: null,
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Minimal Project',
      owner_user_id: TEST_USER_ID,
      prefix: 'min',
      updated_at: TEST_TIMESTAMP,
    };

    MOCK_SUPABASE.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(MOCK_SUPABASE_RESPONSE, null)),
    });

    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Minimal Project',
      prefix: 'min',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_SUPABASE.rpc).toHaveBeenCalledWith('create_project_with_default_locale', {
      p_default_locale: 'en',
      p_default_locale_label: 'English',
      p_description: undefined,
      p_name: 'Minimal Project',
      p_prefix: 'min',
    });
  });

  it('should handle duplicate name conflict', async () => {
    const MOCK_SUPABASE_ERROR = createMockSupabaseError(
      `duplicate key value violates unique constraint "${PROJECTS_CONSTRAINTS.NAME_UNIQUE_PER_OWNER}"`,
      PROJECTS_PG_ERROR_CODES.UNIQUE_VIOLATION
    );

    MOCK_SUPABASE.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, MOCK_SUPABASE_ERROR)),
    });

    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Existing Project',
      prefix: 'new',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

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
    const MOCK_SUPABASE_ERROR = createMockSupabaseError(
      `duplicate key value violates unique constraint "${PROJECTS_CONSTRAINTS.PREFIX_UNIQUE_PER_OWNER}"`,
      PROJECTS_PG_ERROR_CODES.UNIQUE_VIOLATION
    );

    MOCK_SUPABASE.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, MOCK_SUPABASE_ERROR)),
    });

    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'New Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

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
    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test',
      prefix: 'a', // only 1 character
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate invalid prefix (too long)', async () => {
    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test',
      prefix: 'toolong', // 7 characters
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate invalid prefix (ends with dot)', async () => {
    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test',
      prefix: 'app.',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate invalid locale code format', async () => {
    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'invalid',
      default_locale_label: 'Invalid',
      name: 'Test',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should accept valid BCP-47 locale codes', async () => {
    const MOCK_SUPABASE_RESPONSE = {
      created_at: TEST_TIMESTAMP,
      default_locale: 'en-US',
      description: null,
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'US Project',
      owner_user_id: TEST_USER_ID,
      prefix: 'usp',
      updated_at: TEST_TIMESTAMP,
    };

    MOCK_SUPABASE.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(MOCK_SUPABASE_RESPONSE, null)),
    });

    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en-US',
      default_locale_label: 'English (US)',
      name: 'US Project',
      prefix: 'usp',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

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
    const MOCK_SUPABASE_ERROR = createMockSupabaseError('Database error', 'PGRST301');

    MOCK_SUPABASE.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, MOCK_SUPABASE_ERROR)),
    });

    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 500,
        details: { original: MOCK_SUPABASE_ERROR },
        message: 'Failed to create project',
      },
    });
  });

  it('should handle no data returned from database', async () => {
    MOCK_SUPABASE.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, null)),
    });

    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

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
    MOCK_SUPABASE.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockRejectedValue(networkError),
    });

    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it('should validate maximum name length', async () => {
    const longName = 'a'.repeat(256); // exceeds max length

    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: longName,
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate empty name', async () => {
    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: '',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate locale label minimum length', async () => {
    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: '', // empty label
      name: 'Test Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate locale label maximum length', async () => {
    const LONG_LABEL = 'a'.repeat(256); // exceeds max length

    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: LONG_LABEL,
      name: 'Test Project',
      prefix: 'test',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate prefix with uppercase letters', async () => {
    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test Project',
      prefix: 'TEST', // uppercase not allowed
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should validate prefix with special characters', async () => {
    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      name: 'Test Project',
      prefix: 'te$t', // special characters not allowed
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should accept valid two-letter locale code', async () => {
    const MOCK_SUPABASE_RESPONSE = {
      created_at: TEST_TIMESTAMP,
      default_locale: 'zh',
      description: null,
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Chinese Project',
      owner_user_id: TEST_USER_ID,
      prefix: 'zh',
      updated_at: TEST_TIMESTAMP,
    };

    MOCK_SUPABASE.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(MOCK_SUPABASE_RESPONSE, null)),
    });

    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'zh',
      default_locale_label: 'Chinese',
      name: 'Chinese Project',
      prefix: 'zh',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.default_locale).toBe('zh');
  });

  it('should trim whitespace from name and description', async () => {
    const MOCK_SUPABASE_RESPONSE = {
      created_at: TEST_TIMESTAMP,
      default_locale: 'en',
      description: 'Trimmed description',
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Trimmed Project',
      owner_user_id: TEST_USER_ID,
      prefix: 'trim',
      updated_at: TEST_TIMESTAMP,
    };

    MOCK_SUPABASE.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(MOCK_SUPABASE_RESPONSE, null)),
    });

    const PROJECT_DATA: CreateProjectRequest = {
      default_locale: 'en',
      default_locale_label: 'English',
      description: '  Trimmed description  ',
      name: '  Trimmed Project  ',
      prefix: 'trim',
    };

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(PROJECT_DATA);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_SUPABASE.rpc).toHaveBeenCalledWith('create_project_with_default_locale', {
      p_default_locale: 'en',
      p_default_locale_label: 'English',
      p_description: 'Trimmed description',
      p_name: 'Trimmed Project',
      p_prefix: 'trim',
    });
  });
});
