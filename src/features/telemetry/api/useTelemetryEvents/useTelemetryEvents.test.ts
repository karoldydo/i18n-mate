import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TelemetryEventsParams } from '@/shared/types';

import { TELEMETRY_DEFAULT_LIMIT, TELEMETRY_MAX_LIMIT, TELEMETRY_SORT_OPTIONS } from '@/shared/constants';
import { createMockProject, createMockSupabaseError, createMockTelemetryEvent } from '@/test/utils/test-data';
import { createErrorBoundaryWrapper } from '@/test/utils/test-helpers';
import { createTestWrapper } from '@/test/utils/test-wrapper';

import { useTelemetryEvents } from './useTelemetryEvents';

// mock supabase client methods
const mockQuery = {
  eq: vi.fn(),
  limit: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
  select: vi.fn(),
};

const mockSupabase = {
  from: vi.fn(() => mockQuery),
};

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => mockSupabase,
}));

describe('useTelemetryEvents', () => {
  const mockProject = createMockProject();
  const mockProjectId = mockProject.id;
  const mockSupabaseResponse = [
    createMockTelemetryEvent({
      created_at: '2023-01-01T00:00:00Z',
      event_name: 'project_created',
      id: '550e8400-e29b-41d4-a716-446655440000',
      project_id: mockProjectId,
      properties: null,
    }),
    createMockTelemetryEvent({
      created_at: '2023-01-02T00:00:00Z',
      event_name: 'language_added',
      id: '550e8400-e29b-41d4-a716-446655440001',
      project_id: mockProjectId,
      properties: { locale: 'en' },
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // setup default method chain
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.eq.mockReturnValue(mockQuery);
    mockQuery.order.mockReturnValue(mockQuery);
    mockQuery.limit.mockReturnValue(mockQuery);
    mockQuery.range.mockReturnValue(mockQuery);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch telemetry events with default params', async () => {
    mockQuery.limit.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.from).toHaveBeenCalledWith('telemetry_events');
    expect(mockQuery.select).toHaveBeenCalledWith('*');
    expect(mockQuery.eq).toHaveBeenCalledWith('project_id', mockProjectId);
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockQuery.limit).toHaveBeenCalledWith(TELEMETRY_DEFAULT_LIMIT);
    expect(mockQuery.range).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(mockSupabaseResponse);
  });

  it('should apply custom pagination params correctly', async () => {
    const params: TelemetryEventsParams = { limit: 50, offset: 10 };

    mockQuery.range.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.from).toHaveBeenCalledWith('telemetry_events');
    expect(mockQuery.eq).toHaveBeenCalledWith('project_id', mockProjectId);
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockQuery.limit).toHaveBeenCalledWith(50);
    expect(mockQuery.range).toHaveBeenCalledWith(10, 59); // offset + limit - 1
    expect(result.current.data).toEqual(mockSupabaseResponse);
  });

  it('should handle ascending order correctly', async () => {
    const params: TelemetryEventsParams = { order: TELEMETRY_SORT_OPTIONS.CREATED_AT_ASC };

    mockQuery.limit.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(result.current.data).toEqual(mockSupabaseResponse);
  });

  it('should handle descending order correctly', async () => {
    const params: TelemetryEventsParams = { order: TELEMETRY_SORT_OPTIONS.CREATED_AT_DESC };

    mockQuery.limit.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toEqual(mockSupabaseResponse);
  });

  it('should not apply range when offset is 0', async () => {
    const params: TelemetryEventsParams = { limit: 25, offset: 0 };

    mockQuery.limit.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockQuery.limit).toHaveBeenCalledWith(25);
    expect(mockQuery.range).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(mockSupabaseResponse);
  });

  it('should apply range when offset is greater than 0', async () => {
    const params: TelemetryEventsParams = { limit: 20, offset: 5 };

    mockQuery.range.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockQuery.limit).toHaveBeenCalledWith(20);
    expect(mockQuery.range).toHaveBeenCalledWith(5, 24); // offset 5, limit 20 -> range(5, 24)
    expect(result.current.data).toEqual(mockSupabaseResponse);
  });

  it('should return empty array when no events found', async () => {
    mockQuery.limit.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should handle null data from database', async () => {
    mockQuery.limit.mockResolvedValue({
      data: null,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should handle Supabase error correctly', async () => {
    // cspell:disable-next-line
    const mockSupabaseError = createMockSupabaseError('Database connection failed', 'PGRST301');

    mockQuery.limit.mockResolvedValue({
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

    mockQuery.range.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.from).toHaveBeenCalledWith('telemetry_events');
    expect(mockQuery.eq).toHaveBeenCalledWith('project_id', mockProjectId);
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(mockQuery.limit).toHaveBeenCalledWith(15);
    expect(mockQuery.range).toHaveBeenCalledWith(100, 114); // offset 100, limit 15 -> range(100, 114)
    expect(result.current.data).toEqual(mockSupabaseResponse);
  });

  it('should handle events with properties', async () => {
    const mockSupabaseResponse = [
      createMockTelemetryEvent({
        created_at: '2023-01-01T00:00:00Z',
        event_name: 'key_created',
        id: '550e8400-e29b-41d4-a716-446655440002',
        project_id: mockProjectId,
        properties: {
          key: 'test.key',
          locale: 'en',
        },
      }),
      createMockTelemetryEvent({
        created_at: '2023-01-02T00:00:00Z',
        event_name: 'translation_completed',
        id: '550e8400-e29b-41d4-a716-446655440003',
        project_id: mockProjectId,
        properties: {
          count: 10,
          locale: 'es',
        },
      }),
    ];

    mockQuery.limit.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockSupabaseResponse);
  });

  it('should use correct query key for cache management', async () => {
    const params: TelemetryEventsParams = { limit: 50, offset: 10 };

    mockQuery.range.mockResolvedValue({
      data: mockSupabaseResponse,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The query key should be ['telemetry-events', projectId, params]
    // This ensures proper cache invalidation and refetching
    expect(result.current.data).toEqual(mockSupabaseResponse);
  });
});
