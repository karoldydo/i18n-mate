import { z } from 'zod';

import type {
  EventType,
  Json,
  TelemetryEventResponse,
  TelemetryEventsRequest,
  TelemetryEventsResponseItem,
} from '@/shared/types';

import {
  TELEMETRY_DEFAULT_LIMIT,
  TELEMETRY_ERROR_MESSAGES,
  TELEMETRY_EVENT_TYPES,
  TELEMETRY_MAX_LIMIT,
  TELEMETRY_MIN_OFFSET,
  TELEMETRY_SORT_OPTIONS,
} from '@/shared/constants';

const JSON_SCHEMA: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JSON_SCHEMA),
    z.record(z.union([JSON_SCHEMA, z.undefined()])),
  ])
);

/**
 * Zod schema for validating telemetry event names
 *
 * Validates that event names match one of the allowed telemetry event types:
 * project_created, language_added, key_created, or translation_completed.
 *
 * @returns {z.ZodEnum<[EventType, ...EventType[]]>} Zod enum schema for event type validation
 */
export const EVENT_NAME_SCHEMA = z.enum([
  TELEMETRY_EVENT_TYPES.PROJECT_CREATED,
  TELEMETRY_EVENT_TYPES.LANGUAGE_ADDED,
  TELEMETRY_EVENT_TYPES.KEY_CREATED,
  TELEMETRY_EVENT_TYPES.TRANSLATION_COMPLETED,
]) satisfies z.ZodType<EventType>;

/**
 * Zod schema for validating UUID format
 *
 * Validates that a string is a valid UUID v4 format. Used for validating
 * project IDs and other UUID-based identifiers in telemetry requests.
 *
 * @returns {z.ZodString} Zod string schema with UUID validation
 */
export const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

/**
 * Zod schema for validating telemetry events request parameters
 *
 * Validates pagination and filtering parameters for fetching telemetry events.
 * Includes limit (1-100, default: 50), offset (min: 0, default: 0), sort order,
 * and required project_id UUID.
 *
 * @returns {z.ZodType<TelemetryEventsRequest>} Zod object schema for request validation
 */
export const TELEMETRY_EVENTS_SCHEMA = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(TELEMETRY_MAX_LIMIT, TELEMETRY_ERROR_MESSAGES.LIMIT_TOO_HIGH)
    .optional()
    .default(TELEMETRY_DEFAULT_LIMIT),
  offset: z
    .number()
    .int()
    .min(TELEMETRY_MIN_OFFSET, TELEMETRY_ERROR_MESSAGES.NEGATIVE_OFFSET)
    .optional()
    .default(TELEMETRY_MIN_OFFSET),
  order: z
    .enum([TELEMETRY_SORT_OPTIONS.CREATED_AT_ASC, TELEMETRY_SORT_OPTIONS.CREATED_AT_DESC])
    .optional()
    .default(TELEMETRY_SORT_OPTIONS.CREATED_AT_DESC),
  project_id: z.string().uuid(TELEMETRY_ERROR_MESSAGES.INVALID_PROJECT_ID),
}) satisfies z.ZodType<TelemetryEventsRequest>;

/**
 * Zod schema for validating a single telemetry event response
 *
 * Validates the structure of a telemetry event returned from the database,
 * including id, created_at timestamp, event_name, project_id, and optional
 * properties JSON object.
 *
 * @returns {z.ZodType<TelemetryEventResponse>} Zod object schema for event response validation
 */
export const TELEMETRY_EVENT_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  event_name: EVENT_NAME_SCHEMA,
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  properties: JSON_SCHEMA.nullable(),
}) satisfies z.ZodType<TelemetryEventResponse>;

/**
 * Zod schema for validating telemetry event response items from RPC function
 *
 * Validates telemetry events returned from the `list_telemetry_events_with_count` RPC function.
 * Includes all fields from TELEMETRY_EVENT_RESPONSE_SCHEMA plus total_count for pagination metadata.
 *
 * @returns {z.ZodType<TelemetryEventsResponseItem>} Zod object schema for RPC response item validation
 */
export const TELEMETRY_EVENT_RESPONSE_ITEM_SCHEMA = z.object({
  created_at: z.string(),
  event_name: EVENT_NAME_SCHEMA,
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  properties: JSON_SCHEMA.nullable(),
  total_count: z.number().int().min(0),
}) satisfies z.ZodType<TelemetryEventsResponseItem>;
