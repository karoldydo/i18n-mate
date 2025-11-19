/**
 * Minimum pagination limit for translation jobs.
 *
 * @type {number}
 */
export const TRANSLATION_JOBS_MIN_LIMIT = 1;

/**
 * Default pagination limit for translation jobs.
 *
 * @type {number}
 */
export const TRANSLATION_JOBS_DEFAULT_LIMIT = 20;

/**
 * Maximum pagination limit for translation jobs.
 *
 * @type {number}
 */
export const TRANSLATION_JOBS_MAX_LIMIT = 100;

/**
 * Default pagination limit for translation job items.
 *
 * @type {number}
 */
export const TRANSLATION_JOBS_DEFAULT_ITEMS_LIMIT = 100;

/**
 * Maximum pagination limit for translation job items.
 *
 * @type {number}
 */
export const TRANSLATION_JOBS_MAX_ITEMS_LIMIT = 1000;

/**
 * Minimum pagination offset.
 *
 * @type {number}
 */
export const TRANSLATION_JOBS_MIN_OFFSET = 0;

/**
 * Minimum temperature value for LLM parameters.
 *
 * @type {number}
 */
export const TRANSLATION_JOBS_PARAMS_TEMPERATURE_MIN = 0;

/**
 * Maximum temperature value for LLM parameters.
 *
 * @type {number}
 */
export const TRANSLATION_JOBS_PARAMS_TEMPERATURE_MAX = 2;

/**
 * Minimum max tokens value for LLM parameters.
 *
 * @type {number}
 */
export const TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MIN = 1;

/**
 * Maximum max tokens value for LLM parameters.
 *
 * @type {number}
 */
export const TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MAX = 4096;

/**
 * Polling intervals for translation job status checks (in milliseconds).
 *
 * @type {ReadonlyArray<number>}
 */
export const TRANSLATION_JOBS_POLL_INTERVALS = [2000, 2000, 3000, 5000, 5000];

/**
 * Maximum number of polling attempts for translation job status (30 minutes max).
 *
 * @type {number}
 */
export const TRANSLATION_JOBS_POLL_MAX_ATTEMPTS = 360;

/**
 * PostgreSQL error codes relevant to translation jobs operations.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const TRANSLATION_JOBS_PG_ERROR_CODES = {
  CHECK_VIOLATION: '23514',
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
} as const;

/**
 * Database constraint names for translation jobs.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const TRANSLATION_JOBS_CONSTRAINTS = {
  ACTIVE_JOB_UNIQUE: 'prevent_multiple_active_jobs_trigger',
  SOURCE_LOCALE_DEFAULT: 'validate_source_locale_is_default_trigger',
} as const;

/**
 * Centralized error messages for translation jobs.
 *
 * Note: Some error messages are API-layer only (client-side validation),
 * while others map directly to database error codes from migrations.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const TRANSLATION_JOBS_ERROR_MESSAGES = {
  ACTIVE_JOB_EXISTS: 'Another translation job is already active for this project',
  ALL_MODE_NO_KEYS: 'All mode should not include specific key IDs', // API-layer
  CHECK_VIOLATION: 'Data validation failed',
  DATABASE_ERROR: 'Database operation failed',
  DATABASE_SCHEMA_ERROR: 'Database schema error',
  EDGE_FUNCTION_ERROR: 'Translation service temporarily unavailable', // API-layer
  FOREIGN_KEY_VIOLATION: 'Referenced resource not found or access denied',
  INSUFFICIENT_PRIVILEGE: 'Permission denied',
  INVALID_JOB_ID: 'Invalid job ID format', // API-layer
  INVALID_KEY_ID: 'Invalid key ID format', // API-layer
  INVALID_MAX_TOKENS: `Max tokens must be between ${TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MIN} and ${TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MAX}`, // API-layer
  INVALID_MODE: 'Mode must be one of: all, selected, single', // API-layer
  INVALID_PROJECT_ID: 'Invalid project ID format', // API-layer
  INVALID_TARGET_LOCALE: 'Target locale must be in BCP-47 format (e.g., "en" or "en-US")', // API-layer
  INVALID_TEMPERATURE: `Temperature must be between ${TRANSLATION_JOBS_PARAMS_TEMPERATURE_MIN} and ${TRANSLATION_JOBS_PARAMS_TEMPERATURE_MAX}`, // API-layer
  JOB_NOT_CANCELLABLE: 'Job is not in a cancellable state', // API-layer
  JOB_NOT_FOUND: 'Translation job not found or access denied',
  NO_DATA_RETURNED: 'No data returned from server', // API-layer
  OPENROUTER_ERROR: 'Translation provider error', // API-layer
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded, please try again later', // API-layer
  RESOURCE_ALREADY_EXISTS: 'Resource already exists',
  SELECTED_MODE_REQUIRES_KEYS: 'Selected mode requires at least one key ID', // API-layer
  SINGLE_MODE_ONE_KEY: 'Single mode requires exactly one key ID', // API-layer
  TARGET_LOCALE_IS_DEFAULT: 'Target locale cannot be the default locale',
  TARGET_LOCALE_NOT_FOUND: 'Target locale does not exist in project',
} as const;

/**
 * Job statuses that indicate an active (in-progress) job.
 *
 * @type {ReadonlyArray<string>}
 */
export const ACTIVE_JOB_STATUSES = ['pending', 'running'] as const;

/**
 * Job statuses that indicate a finished (completed) job.
 *
 * @type {ReadonlyArray<string>}
 */
export const FINISHED_JOB_STATUSES = ['completed', 'failed', 'cancelled'] as const;

/**
 * Job statuses that allow cancellation.
 *
 * @type {ReadonlyArray<string>}
 */
export const CANCELLABLE_JOB_STATUSES = ['pending', 'running'] as const;

/**
 * Validation utilities for translation jobs.
 *
 * @type {Readonly<{isActiveStatus: (status: string) => boolean, isCancellableStatus: (status: string) => boolean, isFinishedStatus: (status: string) => boolean}>}
 */
export const TRANSLATION_JOBS_VALIDATION = {
  /**
   * Check if a job status indicates an active (in-progress) job.
   *
   * @param {string} status - The job status to check
   * @returns {boolean} True if the status indicates an active job, false otherwise
   */
  isActiveStatus: (status: string): boolean => {
    return ACTIVE_JOB_STATUSES.includes(status as (typeof ACTIVE_JOB_STATUSES)[number]);
  },

  /**
   * Check if a job status allows cancellation.
   *
   * @param {string} status - The job status to check
   * @returns {boolean} True if the status allows cancellation, false otherwise
   */
  isCancellableStatus: (status: string): boolean => {
    return CANCELLABLE_JOB_STATUSES.includes(status as (typeof CANCELLABLE_JOB_STATUSES)[number]);
  },

  /**
   * Check if a job status indicates a finished (completed) job.
   *
   * @param {string} status - The job status to check
   * @returns {boolean} True if the status indicates a finished job, false otherwise
   */
  isFinishedStatus: (status: string): boolean => {
    return FINISHED_JOB_STATUSES.includes(status as (typeof FINISHED_JOB_STATUSES)[number]);
  },
};
