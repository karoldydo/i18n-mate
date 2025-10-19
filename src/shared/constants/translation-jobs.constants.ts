/**
 * Translation Jobs Constants and Validation Patterns
 *
 * Centralized definitions for translation job validation patterns to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL domain constraints.
 */

// Pagination defaults
export const TRANSLATION_JOBS_MIN_LIMIT = 1;
export const TRANSLATION_JOBS_DEFAULT_LIMIT = 20;
export const TRANSLATION_JOBS_MAX_LIMIT = 100;
export const TRANSLATION_JOBS_DEFAULT_ITEMS_LIMIT = 100;
export const TRANSLATION_JOBS_MAX_ITEMS_LIMIT = 1000;
export const TRANSLATION_JOBS_MIN_OFFSET = 0;

// LLM parameter constraints
export const TRANSLATION_JOBS_PARAMS_TEMPERATURE_MIN = 0;
export const TRANSLATION_JOBS_PARAMS_TEMPERATURE_MAX = 2;
export const TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MIN = 1;
export const TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MAX = 4096;

// Polling configuration
export const TRANSLATION_JOBS_POLL_INTERVALS = [2000, 2000, 3000, 5000, 5000]; // milliseconds
export const TRANSLATION_JOBS_POLL_MAX_ATTEMPTS = 180; // 15 minutes max

// PostgreSQL error codes and constraints
export const TRANSLATION_JOBS_PG_ERROR_CODES = {
  CHECK_VIOLATION: '23514',
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
} as const;

export const TRANSLATION_JOBS_CONSTRAINTS = {
  ACTIVE_JOB_UNIQUE: 'prevent_multiple_active_jobs_trigger',
  SOURCE_LOCALE_DEFAULT: 'validate_source_locale_is_default_trigger',
} as const;

// Centralized error messages
export const TRANSLATION_JOBS_ERROR_MESSAGES = {
  ACTIVE_JOB_EXISTS: 'Another translation job is already active for this project',
  ALL_MODE_NO_KEYS: 'All mode should not include specific key IDs',
  DATABASE_ERROR: 'Database operation failed',
  EDGE_FUNCTION_ERROR: 'Translation service temporarily unavailable',
  INVALID_JOB_ID: 'Invalid job ID format',
  INVALID_KEY_ID: 'Invalid key ID format',
  INVALID_MAX_TOKENS: `Max tokens must be between ${TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MIN} and ${TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MAX}`,
  INVALID_MODE: 'Mode must be one of: all, selected, single',
  INVALID_PROJECT_ID: 'Invalid project ID format',
  INVALID_TARGET_LOCALE: 'Target locale must be in BCP-47 format (e.g., "en" or "en-US")',
  INVALID_TEMPERATURE: `Temperature must be between ${TRANSLATION_JOBS_PARAMS_TEMPERATURE_MIN} and ${TRANSLATION_JOBS_PARAMS_TEMPERATURE_MAX}`,
  JOB_NOT_CANCELLABLE: 'Job is not in a cancellable state',
  JOB_NOT_FOUND: 'Translation job not found or access denied',
  NO_DATA_RETURNED: 'No data returned from server',
  OPENROUTER_ERROR: 'Translation provider error',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded, please try again later',
  SELECTED_MODE_REQUIRES_KEYS: 'Selected mode requires at least one key ID',
  SINGLE_MODE_ONE_KEY: 'Single mode requires exactly one key ID',
  TARGET_LOCALE_IS_DEFAULT: 'Target locale cannot be the default locale',
  TARGET_LOCALE_NOT_FOUND: 'Target locale does not exist in project',
} as const;

// Job status helpers
export const ACTIVE_JOB_STATUSES = ['pending', 'running'] as const;
export const FINISHED_JOB_STATUSES = ['completed', 'failed', 'cancelled'] as const;
export const CANCELLABLE_JOB_STATUSES = ['pending', 'running'] as const;

// Validation utilities
export const TRANSLATION_JOBS_VALIDATION = {
  isActiveStatus: (status: string): boolean => {
    return ACTIVE_JOB_STATUSES.includes(status as (typeof ACTIVE_JOB_STATUSES)[number]);
  },
  isCancellableStatus: (status: string): boolean => {
    return CANCELLABLE_JOB_STATUSES.includes(status as (typeof CANCELLABLE_JOB_STATUSES)[number]);
  },
  isFinishedStatus: (status: string): boolean => {
    return FINISHED_JOB_STATUSES.includes(status as (typeof FINISHED_JOB_STATUSES)[number]);
  },
};
