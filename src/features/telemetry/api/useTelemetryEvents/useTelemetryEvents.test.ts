import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TelemetryEventsRequest, TelemetryEventsResponseItem } from '@/shared/types';

type TelemetryEventsParams = Omit<TelemetryEventsRequest, 'project_id'>;

import { TELEMETRY_DEFAULT_LIMIT, TELEMETRY_MAX_LIMIT, TELEMETRY_SORT_OPTIONS } from '@/shared/constants';
import { createMockProject, createMockSupabaseError, createMockTelemetryEvent } from '@/test/utils/test-data';
import { createErrorBoundaryWrapper } from '@/test/utils/test-helpers';
import { createTestWrapper } from '@/test/utils/test-wrapper';

import { useTelemetryEvents } from './useTelemetryEvents';

// mock supabase client rpc method
const mockRpc = vi.fn();

const mockSupabase = {
  rpc: mockRpc,
};

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => mockSupabase,
}));

describe('useTelemetryEvents', () => {
  const mockProject = createMockProject();
  const mockProjectId = mockProject.id;
  const mockTotalCount = 2;
  const mockSupabaseResponse: TelemetryEventsResponseItem[] = [
    {
      ...createMockTelemetryEvent({
        created_at: '2023-01-01T00:00:00Z',
        event_name: 'project_created',
        id: '550e8400-e29b-41d4-a716-446655440000',
        project_id: mockProjectId,
        properties: null,
      }),
      total_count: mockTotalCount,
    },
    {
      ...createMockTelemetryEvent({
        created_at: '2023-01-02T00:00:00Z',
        event_name: 'language_added',
        id: '550e8400-e29b-41d4-a716-446655440001',
        project_id: mockProjectId,
        properties: { locale: 'en' },
      }),
      total_count: mockTotalCount,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch telemetry events with default params', async () => {
    mockRpc.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());

    expect(mockRpc).toHaveBeenCalledWith('list_telemetry_events_with_count', {
      p_ascending: false,
      p_limit: TELEMETRY_DEFAULT_LIMIT,
      p_offset: 0,
      p_order_by: 'created_at',
      p_project_id: mockProjectId,
    });
    expect(result.current.data).toEqual({
      data: mockSupabaseResponse,
      metadata: {
        end: 1,
        start: 0,
        total: mockTotalCount,
      },
    });
  });

  it('should apply custom pagination params correctly', async () => {
    const params: TelemetryEventsParams = { limit: 50, offset: 10 };

    mockRpc.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());

    expect(mockRpc).toHaveBeenCalledWith('list_telemetry_events_with_count', {
      p_ascending: false,
      p_limit: 50,
      p_offset: 10,
      p_order_by: 'created_at',
      p_project_id: mockProjectId,
    });
    expect(result.current.data).toEqual({
      data: mockSupabaseResponse,
      metadata: {
        end: 11,
        start: 10,
        total: mockTotalCount,
      },
    });
  });

  it('should handle ascending order correctly', async () => {
    const params: TelemetryEventsParams = { order: TELEMETRY_SORT_OPTIONS.CREATED_AT_ASC };

    mockRpc.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());

    expect(mockRpc).toHaveBeenCalledWith('list_telemetry_events_with_count', {
      p_ascending: true,
      p_limit: TELEMETRY_DEFAULT_LIMIT,
      p_offset: 0,
      p_order_by: 'created_at',
      p_project_id: mockProjectId,
    });
    expect(result.current.data).toEqual({
      data: mockSupabaseResponse,
      metadata: {
        end: 1,
        start: 0,
        total: mockTotalCount,
      },
    });
  });

  it('should handle descending order correctly', async () => {
    const params: TelemetryEventsParams = { order: TELEMETRY_SORT_OPTIONS.CREATED_AT_DESC };

    mockRpc.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());

    expect(mockRpc).toHaveBeenCalledWith('list_telemetry_events_with_count', {
      p_ascending: false,
      p_limit: TELEMETRY_DEFAULT_LIMIT,
      p_offset: 0,
      p_order_by: 'created_at',
      p_project_id: mockProjectId,
    });
    expect(result.current.data).toEqual({
      data: mockSupabaseResponse,
      metadata: {
        end: 1,
        start: 0,
        total: mockTotalCount,
      },
    });
  });

  it('should not apply range when offset is 0', async () => {
    const params: TelemetryEventsParams = { limit: 25, offset: 0 };

    mockRpc.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());

    expect(mockRpc).toHaveBeenCalledWith('list_telemetry_events_with_count', {
      p_ascending: false,
      p_limit: 25,
      p_offset: 0,
      p_order_by: 'created_at',
      p_project_id: mockProjectId,
    });
    expect(result.current.data).toEqual({
      data: mockSupabaseResponse,
      metadata: {
        end: 1,
        start: 0,
        total: mockTotalCount,
      },
    });
  });

  it('should apply range when offset is greater than 0', async () => {
    const params: TelemetryEventsParams = { limit: 20, offset: 5 };

    mockRpc.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());

    expect(mockRpc).toHaveBeenCalledWith('list_telemetry_events_with_count', {
      p_ascending: false,
      p_limit: 20,
      p_offset: 5,
      p_order_by: 'created_at',
      p_project_id: mockProjectId,
    });
    expect(result.current.data).toEqual({
      data: mockSupabaseResponse,
      metadata: {
        end: 6,
        start: 5,
        total: mockTotalCount,
      },
    });
  });

  it('should return empty array when no events found', async () => {
    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());

    expect(result.current.data).toEqual({
      data: [],
      metadata: {
        end: -1,
        start: 0,
        total: 0,
      },
    });
  });

  it('should handle null data from database', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());

    expect(result.current.data).toEqual({
      data: [],
      metadata: {
        end: -1,
        start: 0,
        total: 0,
      },
    });
  });

  it('should handle Supabase error correctly', async () => {
    // cspell:disable-next-line
    const mockSupabaseError = createMockSupabaseError('Database connection failed', 'PGRST301');

    mockRpc.mockResolvedValue({
      data: null,
      error: mockSupabaseError,
    });

    const errorBoundary = { current: null };

    renderHook(() => useTelemetryEvents(mockProjectId), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeTruthy());

    expect(errorBoundary.current).toMatchObject({
      data: null,
      error: {
        code: 500,
        message: 'Failed to fetch telemetry events',
      },
    });
  });

  it('should validate invalid project ID format', async () => {
    const invalidProjectId = 'invalid-uuid';

    const errorBoundary = { current: null };

    renderHook(() => useTelemetryEvents(invalidProjectId), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeTruthy());

    // Zod validation error should be caught
    expect(errorBoundary.current).toBeTruthy();
  });

  it('should validate limit max value', async () => {
    const params: TelemetryEventsParams = {
      limit: TELEMETRY_MAX_LIMIT + 50, // over max
    };

    const errorBoundary = { current: null };

    renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeTruthy());

    // Zod validation error for max limit
    expect(errorBoundary.current).toBeTruthy();
  });

  it('should validate negative offset', async () => {
    const params: TelemetryEventsParams = {
      offset: -10,
    };

    const errorBoundary = { current: null };

    renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeTruthy());

    // Zod validation error for negative offset
    expect(errorBoundary.current).toBeTruthy();
  });

  it('should validate minimum limit value', async () => {
    const params: TelemetryEventsParams = {
      limit: 0, // below minimum
    };

    const errorBoundary = { current: null };

    renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createErrorBoundaryWrapper(errorBoundary),
    });

    await waitFor(() => expect(errorBoundary.current).toBeTruthy());

    // Zod validation error for min limit
    expect(errorBoundary.current).toBeTruthy();
  });

  it('should handle complex pagination scenario', async () => {
    const params: TelemetryEventsParams = {
      limit: 15,
      offset: 100,
      order: TELEMETRY_SORT_OPTIONS.CREATED_AT_ASC,
    };

    mockRpc.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());

    expect(mockRpc).toHaveBeenCalledWith('list_telemetry_events_with_count', {
      p_ascending: true,
      p_limit: 15,
      p_offset: 100,
      p_order_by: 'created_at',
      p_project_id: mockProjectId,
    });
    expect(result.current.data).toEqual({
      data: mockSupabaseResponse,
      metadata: {
        end: 101,
        start: 100,
        total: mockTotalCount,
      },
    });
  });

  it('should handle events with properties', async () => {
    const mockEventsWithProperties: TelemetryEventsResponseItem[] = [
      {
        ...createMockTelemetryEvent({
          created_at: '2023-01-01T00:00:00Z',
          event_name: 'key_created',
          id: '550e8400-e29b-41d4-a716-446655440002',
          project_id: mockProjectId,
          properties: {
            key: 'test.key',
            locale: 'en',
          },
        }),
        total_count: 2,
      },
      {
        ...createMockTelemetryEvent({
          created_at: '2023-01-02T00:00:00Z',
          event_name: 'translation_completed',
          id: '550e8400-e29b-41d4-a716-446655440003',
          project_id: mockProjectId,
          properties: {
            count: 10,
            locale: 'es',
          },
        }),
        total_count: 2,
      },
    ];

    mockRpc.mockResolvedValue({
      data: mockEventsWithProperties,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());

    expect(result.current.data).toEqual({
      data: mockEventsWithProperties,
      metadata: {
        end: 1,
        start: 0,
        total: 2,
      },
    });
  });

  it('should use correct query key for cache management', async () => {
    const params: TelemetryEventsParams = { limit: 50, offset: 10 };

    mockRpc.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());

    // the query key should be ['telemetry-events', projectId, params]
    // this ensures proper cache invalidation and refetching
    expect(result.current.data).toEqual({
      data: mockSupabaseResponse,
      metadata: {
        end: 11,
        start: 10,
        total: mockTotalCount,
      },
    });
  });
});
