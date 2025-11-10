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

// event name enum (for response validation)
export const EVENT_NAME_SCHEMA = z.enum([
  TELEMETRY_EVENT_TYPES.PROJECT_CREATED,
  TELEMETRY_EVENT_TYPES.LANGUAGE_ADDED,
  TELEMETRY_EVENT_TYPES.KEY_CREATED,
  TELEMETRY_EVENT_TYPES.TRANSLATION_COMPLETED,
]) satisfies z.ZodType<EventType>;

// UUID schema
export const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

// telemetry events request schema
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

// response schema for runtime validation
export const TELEMETRY_EVENT_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  event_name: EVENT_NAME_SCHEMA,
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  properties: JSON_SCHEMA.nullable(),
}) satisfies z.ZodType<TelemetryEventResponse>;

// response schema with total_count (from RPC function)
export const TELEMETRY_EVENT_RESPONSE_ITEM_SCHEMA = z.object({
  created_at: z.string(),
  event_name: EVENT_NAME_SCHEMA,
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  properties: JSON_SCHEMA.nullable(),
  total_count: z.number().int().min(0),
}) satisfies z.ZodType<TelemetryEventsResponseItem>;
