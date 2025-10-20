/**
 * Parameters for listing telemetry events (for query keys)
 */
interface TelemetryEventsParams {
  limit?: number;
  offset?: number;
  order?: 'created_at.asc' | 'created_at.desc';
}

/**
 * Query key factory for telemetry events
 * Follows TanStack Query best practices for structured query keys
 */
export const telemetryKeys = {
  all: ['telemetry-events'] as const,
  list: (projectId: string, params?: TelemetryEventsParams) => [...telemetryKeys.lists(), projectId, params] as const,
  lists: () => [...telemetryKeys.all, 'list'] as const,
};
