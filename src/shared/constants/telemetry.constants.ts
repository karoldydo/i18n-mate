/**
 * Event types (must match database enum: event_type).
 *
 * @type {Readonly<Record<string, string>>}
 */
export const TELEMETRY_EVENT_TYPES = {
  KEY_CREATED: 'key_created',
  LANGUAGE_ADDED: 'language_added',
  PROJECT_CREATED: 'project_created',
  TRANSLATION_COMPLETED: 'translation_completed',
} as const;

/**
 * Default pagination limit for telemetry queries.
 *
 * @type {number}
 */
export const TELEMETRY_DEFAULT_LIMIT = 100;

/**
 * Maximum pagination limit for telemetry queries.
 *
 * @type {number}
 */
export const TELEMETRY_MAX_LIMIT = 1000;

/**
 * Minimum pagination offset.
 *
 * @type {number}
 */
export const TELEMETRY_MIN_OFFSET = 0;

/**
 * Sorting options for telemetry queries.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const TELEMETRY_SORT_OPTIONS = {
  CREATED_AT_ASC: 'created_at.asc',
  CREATED_AT_DESC: 'created_at.desc',
} as const;

/**
 * PostgreSQL error codes relevant to telemetry operations.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const TELEMETRY_PG_ERROR_CODES = {
  CHECK_VIOLATION: '23514',
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
} as const;

/**
 * Centralized error messages for telemetry operations.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const TELEMETRY_ERROR_MESSAGES = {
  // Generic errors
  DATABASE_ERROR: 'Database operation failed',
  // Validation errors
  INVALID_EVENT_NAME: 'Invalid event name. Must be one of the allowed telemetry events',
  INVALID_PROJECT_ID: 'Invalid project ID format',
  LIMIT_TOO_HIGH: `Limit must be at most ${TELEMETRY_MAX_LIMIT}`,

  NEGATIVE_OFFSET: 'Offset must be non-negative',

  PARTITION_ERROR: 'Failed to insert event into partition',
  // Database operation errors
  PROJECT_NOT_FOUND: 'Project not found or access denied',
} as const;
