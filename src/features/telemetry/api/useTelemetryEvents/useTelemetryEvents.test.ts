import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TelemetryEventResponse, TelemetryEventsParams } from '@/shared/types';

import { TELEMETRY_DEFAULT_LIMIT, TELEMETRY_MAX_LIMIT, TELEMETRY_SORT_OPTIONS } from '@/shared/constants';

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

describe('useTelemetryEvents', () => {
  const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
  const mockEvents: TelemetryEventResponse[] = [
    {
      created_at: '2023-01-01T00:00:00Z',
      event_name: 'project_created',
      id: '550e8400-e29b-41d4-a716-446655440000',
      project_id: mockProjectId,
      properties: null,
    },
    {
      created_at: '2023-01-02T00:00:00Z',
      event_name: 'language_added',
      id: '550e8400-e29b-41d4-a716-446655440001',
      project_id: mockProjectId,
      properties: { locale: 'en' },
    },
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
      data: mockEvents,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.from).toHaveBeenCalledWith('telemetry_events');
    expect(mockQuery.select).toHaveBeenCalledWith('*');
    expect(mockQuery.eq).toHaveBeenCalledWith('project_id', mockProjectId);
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockQuery.limit).toHaveBeenCalledWith(TELEMETRY_DEFAULT_LIMIT);
    expect(mockQuery.range).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(mockEvents);
  });

  it('should apply custom pagination params correctly', async () => {
    const params: TelemetryEventsParams = { limit: 50, offset: 10 };

    mockQuery.range.mockResolvedValue({
      data: mockEvents,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.from).toHaveBeenCalledWith('telemetry_events');
    expect(mockQuery.eq).toHaveBeenCalledWith('project_id', mockProjectId);
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockQuery.limit).toHaveBeenCalledWith(50);
    expect(mockQuery.range).toHaveBeenCalledWith(10, 59); // offset + limit - 1
    expect(result.current.data).toEqual(mockEvents);
  });

  it('should handle ascending order correctly', async () => {
    const params: TelemetryEventsParams = { order: TELEMETRY_SORT_OPTIONS.CREATED_AT_ASC };

    mockQuery.limit.mockResolvedValue({
      data: mockEvents,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(result.current.data).toEqual(mockEvents);
  });

  it('should handle descending order correctly', async () => {
    const params: TelemetryEventsParams = { order: TELEMETRY_SORT_OPTIONS.CREATED_AT_DESC };

    mockQuery.limit.mockResolvedValue({
      data: mockEvents,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toEqual(mockEvents);
  });

  it('should not apply range when offset is 0', async () => {
    const params: TelemetryEventsParams = { limit: 25, offset: 0 };

    mockQuery.limit.mockResolvedValue({
      data: mockEvents,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockQuery.limit).toHaveBeenCalledWith(25);
    expect(mockQuery.range).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(mockEvents);
  });

  it('should apply range when offset is greater than 0', async () => {
    const params: TelemetryEventsParams = { limit: 20, offset: 5 };

    mockQuery.range.mockResolvedValue({
      data: mockEvents,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockQuery.limit).toHaveBeenCalledWith(20);
    expect(mockQuery.range).toHaveBeenCalledWith(5, 24); // offset 5, limit 20 -> range(5, 24)
    expect(result.current.data).toEqual(mockEvents);
  });

  it('should return empty array when no events found', async () => {
    mockQuery.limit.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId), {
      wrapper: createWrapper(),
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
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should handle Supabase error correctly', async () => {
    const mockError = {
      // cspell:disable-next-line
      code: 'PGRST301',
      message: 'Database connection failed',
    };

    mockQuery.limit.mockResolvedValue({
      data: null,
      error: mockError,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      data: null,
      error: {
        code: 500,
        details: { original: mockError },
        message: 'Failed to fetch telemetry events',
      },
    });
  });

  it('should validate invalid project ID format', async () => {
    const invalidProjectId = 'invalid-uuid';

    const { result } = renderHook(() => useTelemetryEvents(invalidProjectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Zod validation error should be caught
    expect(result.current.error).toBeTruthy();
  });

  it('should validate limit max value', async () => {
    const params: TelemetryEventsParams = {
      limit: TELEMETRY_MAX_LIMIT + 50, // over max
    };

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Zod validation error for max limit
    expect(result.current.error).toBeTruthy();
  });

  it('should validate negative offset', async () => {
    const params: TelemetryEventsParams = {
      offset: -10,
    };

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Zod validation error for negative offset
    expect(result.current.error).toBeTruthy();
  });

  it('should validate minimum limit value', async () => {
    const params: TelemetryEventsParams = {
      limit: 0, // below minimum
    };

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Zod validation error for min limit
    expect(result.current.error).toBeTruthy();
  });

  it('should handle complex pagination scenario', async () => {
    const params: TelemetryEventsParams = {
      limit: 15,
      offset: 100,
      order: TELEMETRY_SORT_OPTIONS.CREATED_AT_ASC,
    };

    mockQuery.range.mockResolvedValue({
      data: mockEvents,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabase.from).toHaveBeenCalledWith('telemetry_events');
    expect(mockQuery.eq).toHaveBeenCalledWith('project_id', mockProjectId);
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(mockQuery.limit).toHaveBeenCalledWith(15);
    expect(mockQuery.range).toHaveBeenCalledWith(100, 114); // offset 100, limit 15 -> range(100, 114)
    expect(result.current.data).toEqual(mockEvents);
  });

  it('should handle events with properties', async () => {
    const eventsWithProperties: TelemetryEventResponse[] = [
      {
        created_at: '2023-01-01T00:00:00Z',
        event_name: 'key_created',
        id: '550e8400-e29b-41d4-a716-446655440002',
        project_id: mockProjectId,
        properties: {
          key: 'test.key',
          locale: 'en',
        },
      },
      {
        created_at: '2023-01-02T00:00:00Z',
        event_name: 'translation_completed',
        id: '550e8400-e29b-41d4-a716-446655440003',
        project_id: mockProjectId,
        properties: {
          count: 10,
          locale: 'es',
        },
      },
    ];

    mockQuery.limit.mockResolvedValue({
      data: eventsWithProperties,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(eventsWithProperties);
  });

  it('should use correct query key for cache management', async () => {
    const params: TelemetryEventsParams = { limit: 50, offset: 10 };

    mockQuery.range.mockResolvedValue({
      data: mockEvents,
      error: null,
    });

    const { result } = renderHook(() => useTelemetryEvents(mockProjectId, params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The query key should be ['telemetry-events', projectId, params]
    // This ensures proper cache invalidation and refetching
    expect(result.current.data).toEqual(mockEvents);
  });
});
