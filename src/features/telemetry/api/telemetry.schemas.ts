import { z } from 'zod';

import {
  TELEMETRY_DEFAULT_LIMIT,
  TELEMETRY_ERROR_MESSAGES,
  TELEMETRY_EVENT_TYPES,
  TELEMETRY_MAX_LIMIT,
  TELEMETRY_MIN_OFFSET,
  TELEMETRY_SORT_OPTIONS,
} from '@/shared/constants';

// Event name enum (for response validation)
export const eventNameSchema = z.enum([
  TELEMETRY_EVENT_TYPES.PROJECT_CREATED,
  TELEMETRY_EVENT_TYPES.LANGUAGE_ADDED,
  TELEMETRY_EVENT_TYPES.KEY_CREATED,
  TELEMETRY_EVENT_TYPES.TRANSLATION_COMPLETED,
]);

// List Telemetry Events Schema
export const listTelemetryEventsSchema = z.object({
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
});

// Response Schema for runtime validation
export const telemetryEventResponseSchema = z.object({
  created_at: z.string(),
  event_name: eventNameSchema,
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  properties: z.any().nullable(),
});
