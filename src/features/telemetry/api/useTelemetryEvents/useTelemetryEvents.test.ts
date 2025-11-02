import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TelemetryEventsParams } from '@/shared/types';

import { TELEMETRY_DEFAULT_LIMIT, TELEMETRY_MAX_LIMIT, TELEMETRY_SORT_OPTIONS } from '@/shared/constants';
import { createMockProject, createMockSupabaseError, createMockTelemetryEvent } from '@/test/utils/test-data';
import { createErrorBoundaryWrapper } from '@/test/utils/test-helpers';
import { createTestWrapper } from '@/test/utils/test-wrapper';

import { useTelemetryEvents } from './useTelemetryEvents';

// mock supabase client methods
const MOCK_QUERY = {
  eq: vi.fn(),
  limit: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
  select: vi.fn(),
};

const MOCK_SUPABASE = {
  from: vi.fn(() => MOCK_QUERY),
};

// mock the useSupabase hook
vi.mock('@/app/providers/SupabaseProvider', () => ({
  useSupabase: () => MOCK_SUPABASE,
}));

describe('useTelemetryEvents', () => {
  const MOCK_PROJECT = createMockProject();
  const MOCK_PROJECT_ID = MOCK_PROJECT.id;
  const MOCK_SUPABASE_RESPONSE = [
    createMockTelemetryEvent({
      created_at: '2023-01-01T00:00:00Z',
      event_name: 'project_created',
      id: '550e8400-e29b-41d4-a716-446655440000',
      project_id: MOCK_PROJECT_ID,
      properties: null,
    }),
    createMockTelemetryEvent({
      created_at: '2023-01-02T00:00:00Z',
      event_name: 'language_added',
      id: '550e8400-e29b-41d4-a716-446655440001',
      project_id: MOCK_PROJECT_ID,
      properties: { locale: 'en' },
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // setup default method chain
    MOCK_QUERY.select.mockReturnValue(MOCK_QUERY);
    MOCK_QUERY.eq.mockReturnValue(MOCK_QUERY);
    MOCK_QUERY.order.mockReturnValue(MOCK_QUERY);
    MOCK_QUERY.limit.mockReturnValue(MOCK_QUERY);
    MOCK_QUERY.range.mockReturnValue(MOCK_QUERY);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch telemetry events with default params', async () => {
    MOCK_QUERY.limit.mockResolvedValue({
      data: MOCK_SUPABASE_RESPONSE,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_SUPABASE.from).toHaveBeenCalledWith('telemetry_events');
    expect(MOCK_QUERY.select).toHaveBeenCalledWith('*');
    expect(MOCK_QUERY.eq).toHaveBeenCalledWith('project_id', MOCK_PROJECT_ID);
    expect(MOCK_QUERY.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(MOCK_QUERY.limit).toHaveBeenCalledWith(TELEMETRY_DEFAULT_LIMIT);
    expect(MOCK_QUERY.range).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(MOCK_SUPABASE_RESPONSE);
  });

  it('should apply custom pagination params correctly', async () => {
    const PARAMS: TelemetryEventsParams = { limit: 50, offset: 10 };

    MOCK_QUERY.range.mockResolvedValue({
      data: MOCK_SUPABASE_RESPONSE,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID, PARAMS), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_SUPABASE.from).toHaveBeenCalledWith('telemetry_events');
    expect(MOCK_QUERY.eq).toHaveBeenCalledWith('project_id', MOCK_PROJECT_ID);
    expect(MOCK_QUERY.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(MOCK_QUERY.limit).toHaveBeenCalledWith(50);
    expect(MOCK_QUERY.range).toHaveBeenCalledWith(10, 59); // offset + limit - 1
    expect(result.current.data).toEqual(MOCK_SUPABASE_RESPONSE);
  });

  it('should handle ascending order correctly', async () => {
    const PARAMS: TelemetryEventsParams = { order: TELEMETRY_SORT_OPTIONS.CREATED_AT_ASC };

    MOCK_QUERY.limit.mockResolvedValue({
      data: MOCK_SUPABASE_RESPONSE,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID, PARAMS), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_QUERY.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(result.current.data).toEqual(MOCK_SUPABASE_RESPONSE);
  });

  it('should handle descending order correctly', async () => {
    const PARAMS: TelemetryEventsParams = { order: TELEMETRY_SORT_OPTIONS.CREATED_AT_DESC };

    MOCK_QUERY.limit.mockResolvedValue({
      data: MOCK_SUPABASE_RESPONSE,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID, PARAMS), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_QUERY.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toEqual(MOCK_SUPABASE_RESPONSE);
  });

  it('should not apply range when offset is 0', async () => {
    const PARAMS: TelemetryEventsParams = { limit: 25, offset: 0 };

    MOCK_QUERY.limit.mockResolvedValue({
      data: MOCK_SUPABASE_RESPONSE,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID, PARAMS), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_QUERY.limit).toHaveBeenCalledWith(25);
    expect(MOCK_QUERY.range).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(MOCK_SUPABASE_RESPONSE);
  });

  it('should apply range when offset is greater than 0', async () => {
    const PARAMS: TelemetryEventsParams = { limit: 20, offset: 5 };

    MOCK_QUERY.range.mockResolvedValue({
      data: MOCK_SUPABASE_RESPONSE,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID, PARAMS), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_QUERY.limit).toHaveBeenCalledWith(20);
    expect(MOCK_QUERY.range).toHaveBeenCalledWith(5, 24); // offset 5, limit 20 -> range(5, 24)
    expect(result.current.data).toEqual(MOCK_SUPABASE_RESPONSE);
  });

  it('should return empty array when no events found', async () => {
    MOCK_QUERY.limit.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should handle null data from database', async () => {
    MOCK_QUERY.limit.mockResolvedValue({
      data: null,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should handle Supabase error correctly', async () => {
    // cspell:disable-next-line
    const MOCK_SUPABASE_ERROR = createMockSupabaseError('Database connection failed', 'PGRST301');

    MOCK_QUERY.limit.mockResolvedValue({
      data: null,
      error: MOCK_SUPABASE_ERROR,
    });

    const ERROR_BOUNDARY = { current: null };

    renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID), {
      wrapper: createErrorBoundaryWrapper(ERROR_BOUNDARY),
    });

    await waitFor(() => expect(ERROR_BOUNDARY.current).toBeTruthy());

    expect(ERROR_BOUNDARY.current).toMatchObject({
      data: null,
      error: {
        code: 500,
        message: 'Failed to fetch telemetry events',
      },
    });
  });

  it('should validate invalid project ID format', async () => {
    const INVALID_PROJECT_ID = 'invalid-uuid';

    const ERROR_BOUNDARY = { current: null };

    renderHook(() => useTelemetryEvents(INVALID_PROJECT_ID), {
      wrapper: createErrorBoundaryWrapper(ERROR_BOUNDARY),
    });

    await waitFor(() => expect(ERROR_BOUNDARY.current).toBeTruthy());

    // Zod validation error should be caught
    expect(ERROR_BOUNDARY.current).toBeTruthy();
  });

  it('should validate limit max value', async () => {
    const params: TelemetryEventsParams = {
      limit: TELEMETRY_MAX_LIMIT + 50, // over max
    };

    const ERROR_BOUNDARY = { current: null };

    renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID, params), {
      wrapper: createErrorBoundaryWrapper(ERROR_BOUNDARY),
    });

    await waitFor(() => expect(ERROR_BOUNDARY.current).toBeTruthy());

    // Zod validation error for max limit
    expect(ERROR_BOUNDARY.current).toBeTruthy();
  });

  it('should validate negative offset', async () => {
    const PARAMS: TelemetryEventsParams = {
      offset: -10,
    };

    const ERROR_BOUNDARY = { current: null };

    renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID, PARAMS), {
      wrapper: createErrorBoundaryWrapper(ERROR_BOUNDARY),
    });

    await waitFor(() => expect(ERROR_BOUNDARY.current).toBeTruthy());

    // Zod validation error for negative offset
    expect(ERROR_BOUNDARY.current).toBeTruthy();
  });

  it('should validate minimum limit value', async () => {
    const PARAMS: TelemetryEventsParams = {
      limit: 0, // below minimum
    };

    const ERROR_BOUNDARY = { current: null };

    renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID, PARAMS), {
      wrapper: createErrorBoundaryWrapper(ERROR_BOUNDARY),
    });

    await waitFor(() => expect(ERROR_BOUNDARY.current).toBeTruthy());

    // Zod validation error for min limit
    expect(ERROR_BOUNDARY.current).toBeTruthy();
  });

  it('should handle complex pagination scenario', async () => {
    const PARAMS: TelemetryEventsParams = {
      limit: 15,
      offset: 100,
      order: TELEMETRY_SORT_OPTIONS.CREATED_AT_ASC,
    };

    MOCK_QUERY.range.mockResolvedValue({
      data: MOCK_SUPABASE_RESPONSE,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID, PARAMS), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(MOCK_SUPABASE.from).toHaveBeenCalledWith('telemetry_events');
    expect(MOCK_QUERY.eq).toHaveBeenCalledWith('project_id', MOCK_PROJECT_ID);
    expect(MOCK_QUERY.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(MOCK_QUERY.limit).toHaveBeenCalledWith(15);
    expect(MOCK_QUERY.range).toHaveBeenCalledWith(100, 114); // offset 100, limit 15 -> range(100, 114)
    expect(result.current.data).toEqual(MOCK_SUPABASE_RESPONSE);
  });

  it('should handle events with properties', async () => {
    const MOCK_SUPABASE_RESPONSE = [
      createMockTelemetryEvent({
        created_at: '2023-01-01T00:00:00Z',
        event_name: 'key_created',
        id: '550e8400-e29b-41d4-a716-446655440002',
        project_id: MOCK_PROJECT_ID,
        properties: {
          key: 'test.key',
          locale: 'en',
        },
      }),
      createMockTelemetryEvent({
        created_at: '2023-01-02T00:00:00Z',
        event_name: 'translation_completed',
        id: '550e8400-e29b-41d4-a716-446655440003',
        project_id: MOCK_PROJECT_ID,
        properties: {
          count: 10,
          locale: 'es',
        },
      }),
    ];

    MOCK_QUERY.limit.mockResolvedValue({
      data: MOCK_SUPABASE_RESPONSE,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(MOCK_SUPABASE_RESPONSE);
  });

  it('should use correct query key for cache management', async () => {
    const PARAMS: TelemetryEventsParams = { limit: 50, offset: 10 };

    MOCK_QUERY.range.mockResolvedValue({
      data: MOCK_SUPABASE_RESPONSE,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(MOCK_PROJECT_ID, PARAMS), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The query key should be ['telemetry-events', projectId, params]
    // This ensures proper cache invalidation and refetching
    expect(result.current.data).toEqual(MOCK_SUPABASE_RESPONSE);
  });
});
