import type { TelemetryEventsParams } from '@/shared/types';

/**
 * Query key factory for telemetry events
 * Follows TanStack Query best practices for structured query keys
 */
export const TELEMETRY_KEYS = {
  all: ['telemetry-events'] as const,
  list: (projectId: string, params?: TelemetryEventsParams) => [...TELEMETRY_KEYS.lists(), projectId, params] as const,
  lists: () => [...TELEMETRY_KEYS.all, 'list'] as const,
};
