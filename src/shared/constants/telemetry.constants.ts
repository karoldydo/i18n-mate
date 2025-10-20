/**
 * Telemetry Constants and Validation Patterns
 *
 * Centralized definitions for telemetry event types and validation to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL enum constraints.
 */

// Event types (must match database enum: event_type)
export const TELEMETRY_EVENT_TYPES = {
  KEY_CREATED: 'key_created',
  LANGUAGE_ADDED: 'language_added',
  PROJECT_CREATED: 'project_created',
  TRANSLATION_COMPLETED: 'translation_completed',
} as const;

// Pagination defaults
export const TELEMETRY_DEFAULT_LIMIT = 100;
export const TELEMETRY_MAX_LIMIT = 1000;
export const TELEMETRY_MIN_OFFSET = 0;

// Sorting options
export const TELEMETRY_SORT_OPTIONS = {
  CREATED_AT_ASC: 'created_at.asc',
  CREATED_AT_DESC: 'created_at.desc',
} as const;

// PostgreSQL error codes
export const TELEMETRY_PG_ERROR_CODES = {
  /** Check constraint violation */
  CHECK_VIOLATION: '23514',
  /** Foreign key violation */
  FOREIGN_KEY_VIOLATION: '23503',
  /** Unique constraint violation */
  UNIQUE_VIOLATION: '23505',
} as const;

// Centralized error messages
export const TELEMETRY_ERROR_MESSAGES = {
  // Generic errors
  DATABASE_ERROR: 'Database operation failed',
  // Validation errors
  INVALID_EVENT_NAME: 'Invalid event name. Must be one of the allowed telemetry events',
  INVALID_PROJECT_ID: 'Invalid project ID format',
  INVALID_PROPERTIES: 'Invalid event properties for the specified event type',
  LIMIT_TOO_HIGH: `Limit must be at most ${TELEMETRY_MAX_LIMIT}`,

  NEGATIVE_OFFSET: 'Offset must be non-negative',
  NO_DATA_RETURNED: 'No data returned from server',

  NOT_OWNER_OR_SERVICE_ROLE: 'Not owner or service_role',
  PARTITION_ERROR: 'Failed to insert event into partition',
  // Database operation errors
  PROJECT_NOT_FOUND: 'Project not found or access denied',
} as const;

// Event property validators
export const TELEMETRY_PROPERTY_VALIDATORS = {
  isValidCompletedKeys: (count: number): boolean => Number.isInteger(count) && count >= 0,
  isValidFailedKeys: (count: number): boolean => Number.isInteger(count) && count >= 0,
  isValidKeyCount: (count: number): boolean => Number.isInteger(count) && count >= 0,
  isValidLocaleCount: (count: number): boolean => Number.isInteger(count) && count > 0,
};
