import { useSuspenseQuery } from '@tanstack/react-query';

import type { ApiErrorResponse, TelemetryEventResponse, TelemetryEventsParams } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../telemetry.errors';
import { LIST_TELEMETRY_EVENTS_SCHEMA, TELEMETRY_EVENT_RESPONSE_SCHEMA } from '../telemetry.schemas';

/**
 * Fetch telemetry events for a project
 *
 * Queries the partitioned `telemetry_events` table with filtering by project_id
 * and optional pagination. Results are ordered by created_at DESC (most recent first)
 * by default. Returns a raw array of events (not wrapped in pagination metadata).
 *
 * @param projectId - UUID of the project to fetch events for
 * @param params - Optional query parameters (limit, offset, order)
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid UUID, limit too high, negative offset)
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns TanStack Query result with array of telemetry events
 */
export function useTelemetryEvents(projectId: string, params?: TelemetryEventsParams) {
  const supabase = useSupabase();

  return useSuspenseQuery<TelemetryEventResponse[], ApiErrorResponse>({
    queryFn: async () => {
      const { limit, offset, order, project_id } = LIST_TELEMETRY_EVENTS_SCHEMA.parse({
        project_id: projectId,
        ...params,
      });

      let query = supabase
        .from('telemetry_events')
        .select('*')
        .eq('project_id', project_id)
        .order('created_at', { ascending: order === 'created_at.asc' })
        .limit(limit);

      // add offset if provided
      if (offset && offset > 0) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw createDatabaseErrorResponse(error, 'useTelemetryEvents', 'Failed to fetch telemetry events');
      }

      return TELEMETRY_EVENT_RESPONSE_SCHEMA.array().parse(data || []);
    },
    queryKey: ['telemetry-events', projectId, params],
  });
}
