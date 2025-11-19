import { useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, TelemetryEventsRequest, TelemetryEventsResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../telemetry.errors';
import { TELEMETRY_EVENT_RESPONSE_ITEM_SCHEMA, TELEMETRY_EVENTS_SCHEMA } from '../telemetry.schemas';

/**
 * Fetch telemetry events for a project with pagination metadata
 *
 * Uses the RPC function `list_telemetry_events_with_count` which returns telemetry events
 * with total count for pagination. Data items are validated at runtime and pagination
 * metadata includes the total count.
 *
 * @param {string} projectId - UUID of the project to fetch events for
 * @param {Omit<TelemetryEventsRequest, 'project_id'>} [params] - Optional query parameters (limit, offset, order)
 * @param {number} [params.limit] - Items per page (1-100, default: 50)
 * @param {number} [params.offset] - Pagination offset (min: 0, default: 0)
 * @param {'created_at.asc' | 'created_at.desc'} [params.order] - Sort order (default: created_at.desc)
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid UUID, limit too high, negative offset)
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns {ReturnType<typeof useSuspenseQuery<TelemetryEventsResponse, ApiErrorResponse>>} TanStack Query result with telemetry events data and pagination metadata
 */
export function useTelemetryEvents(projectId: string, params?: Omit<TelemetryEventsRequest, 'project_id'>) {
  const supabase = useSupabase();

  return useSuspenseQuery<TelemetryEventsResponse, ApiErrorResponse>({
    queryFn: async () => {
      const { limit, offset, order, project_id } = TELEMETRY_EVENTS_SCHEMA.parse({
        project_id: projectId,
        ...params,
      });

      const { data, error } = await supabase.rpc('list_telemetry_events_with_count', {
        p_ascending: order === 'created_at.asc',
        p_limit: limit,
        p_offset: offset,
        p_order_by: 'created_at',
        p_project_id: project_id,
      });

      if (error) {
        throw createDatabaseErrorResponse(error, 'useTelemetryEvents', 'Failed to fetch telemetry events');
      }

      // runtime validation of response data
      const events = z.array(TELEMETRY_EVENT_RESPONSE_ITEM_SCHEMA).parse(data || []);

      // get total count from first record (all records have the same total_count)
      const totalCount = events[0]?.total_count ?? 0;

      return {
        data: events,
        metadata: {
          end: (offset || 0) + events.length - 1,
          start: offset || 0,
          total: totalCount,
        },
      };
    },
    queryKey: ['telemetry-events', projectId, params],
  });
}
