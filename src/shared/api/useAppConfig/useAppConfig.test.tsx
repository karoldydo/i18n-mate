import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestWrapper } from '@/test/utils';

import { useAppConfig } from './useAppConfig';

// mock supabase client
const mockSupabase = {
  rpc: vi.fn(),
};

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => mockSupabase,
}));

describe('useAppConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and parse app config successfully', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [
        { key: 'email_verification_required', value: 'false' },
        { key: 'registration_enabled', value: 'true' },
      ],
      error: null,
    });

    const { result } = renderHook(() => useAppConfig(), { wrapper: createTestWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      emailVerificationRequired: false,
      registrationEnabled: true,
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_public_app_config');
  });

  it('should handle registration disabled', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [
        { key: 'email_verification_required', value: 'true' },
        { key: 'registration_enabled', value: 'false' },
      ],
      error: null,
    });

    const { result } = renderHook(() => useAppConfig(), { wrapper: createTestWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      emailVerificationRequired: true,
      registrationEnabled: false,
    });
  });

  it('should handle RPC error', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    });

    const { result } = renderHook(() => useAppConfig(), { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('Failed to fetch app config');
  });

  it('should handle empty data', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useAppConfig(), { wrapper: createTestWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // when keys are missing, they should default to false
    expect(result.current.data).toEqual({
      emailVerificationRequired: false,
      registrationEnabled: false,
    });
  });
});
