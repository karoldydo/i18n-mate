/**
 * Key format pattern - matches lowercase letters, numbers, dots, underscores, and hyphens.
 * Examples: user.name, auth.login-error, profile_settings, nav.menu.items
 *
 * Pattern breakdown:
 * - ^[a-z0-9._-]+ : start with allowed characters
 * - $ : end of string
 *
 * Note: Additional validation prevents consecutive dots and trailing dots.
 *
 * @type {RegExp}
 */
export const KEY_FORMAT_PATTERN = /^[a-z0-9._-]+$/;

/**
 * Pattern to detect consecutive dots (invalid).
 * Used for validation refinement.
 *
 * @type {RegExp}
 */
export const CONSECUTIVE_DOTS_PATTERN = /\.\./;

/**
 * Pattern to detect trailing dots (invalid).
 * Used for validation refinement.
 *
 * @type {RegExp}
 */
export const KEY_TRAILING_DOT_PATTERN = /\.$/;

/**
 * Maximum length for full key name (including prefix).
 *
 * @type {number}
 */
export const KEY_NAME_MAX_LENGTH = 256;

/**
 * Minimum length for key name.
 *
 * @type {number}
 */
export const KEY_NAME_MIN_LENGTH = 1;

/**
 * Maximum length for translation value.
 *
 * @type {number}
 */
export const TRANSLATION_VALUE_MAX_LENGTH = 250;

/**
 * Minimum length for translation value.
 *
 * @type {number}
 */
export const TRANSLATION_VALUE_MIN_LENGTH = 1;

/**
 * Default pagination limit for key lists.
 *
 * @type {number}
 */
export const KEYS_DEFAULT_LIMIT = 50;

/**
 * Maximum pagination limit for key lists.
 *
 * @type {number}
 */
export const KEYS_MAX_LIMIT = 100;

/**
 * Minimum pagination offset.
 *
 * @type {number}
 */
export const KEYS_MIN_OFFSET = 0;

/**
 * PostgreSQL error codes relevant to keys operations.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const KEYS_PG_ERROR_CODES = {
  CHECK_VIOLATION: '23514',
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
} as const;

/**
 * Database constraint names for keys.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const KEYS_CONSTRAINTS = {
  PROJECT_ID_FKEY: 'keys_project_id_fkey',
  UNIQUE_PER_PROJECT: 'keys_unique_per_project',
} as const;

/**
 * Key validation patterns and utilities.
 *
 * @type {Readonly<{isValidFormatClient: (key: string) => boolean, isValidTranslationValue: (value: string) => boolean}>}
 */
export const KEY_VALIDATION = {
  /**
   * Client-side key format validation.
   * Use for immediate feedback, but always verify server-side for critical operations.
   *
   * Rules implemented:
   * - Must be 1-256 characters long
   * - Only lowercase letters, numbers, dots, underscores, and hyphens
   * - Cannot contain consecutive dots
   * - Cannot end with a dot
   *
   * @param {string} key - The key name to validate
   * @returns {boolean} True if the key format is valid, false otherwise
   */
  isValidFormatClient: (key: string): boolean => {
    if (!key || typeof key !== 'string') return false;
    if (key.length < KEY_NAME_MIN_LENGTH || key.length > KEY_NAME_MAX_LENGTH) return false;
    if (!KEY_FORMAT_PATTERN.test(key)) return false;
    if (CONSECUTIVE_DOTS_PATTERN.test(key)) return false;
    if (KEY_TRAILING_DOT_PATTERN.test(key)) return false;
    return true;
  },

  /**
   * Validate translation value format.
   * Checks length constraints and content rules.
   *
   * @param {string} value - The translation value to validate
   * @returns {boolean} True if the translation value is valid, false otherwise
   */
  isValidTranslationValue: (value: string): boolean => {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (trimmed.length < TRANSLATION_VALUE_MIN_LENGTH || trimmed.length > TRANSLATION_VALUE_MAX_LENGTH) return false;
    if (trimmed.includes('\n')) return false; // No newlines allowed
    return true;
  },
};

/**
 * Error messages for key operations.
 *
 * Note: Some error messages are API-layer only (client-side validation),
 * while others map directly to database error codes from migrations.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const KEYS_ERROR_MESSAGES = {
  DATABASE_ERROR: 'Database operation failed',
  DEFAULT_VALUE_EMPTY: 'Default locale value cannot be empty',
  FANOUT_FAILED: 'Failed to create translations for new key',
  FANOUT_INCOMPLETE: 'Translation initialization incomplete',
  INVALID_FIELD_VALUE: 'Invalid field value', // API-layer
  INVALID_FORMAT: 'Invalid locale format - use BCP-47 format (e.g., "en" or "en-US")',
  INVALID_PROJECT_ID: 'Invalid project_id', // API-layer
  KEY_ALREADY_EXISTS: 'Key already exists in project',
  KEY_CONSECUTIVE_DOTS: 'Key cannot contain consecutive dots',
  KEY_INVALID_FORMAT: 'Key can only contain lowercase letters, numbers, dots, underscores, and hyphens',
  KEY_INVALID_PREFIX: 'Key must start with project prefix',
  KEY_NOT_FOUND: 'Key not found or access denied',
  KEY_REQUIRED: 'Key name is required', // API-layer
  KEY_TOO_LONG: `Key name must be at most ${KEY_NAME_MAX_LENGTH} characters`, // API-layer
  KEY_TRAILING_DOT: 'Key cannot end with a dot',
  NO_DATA_RETURNED: 'No data returned from server', // API-layer
  PROJECT_NOT_OWNED: 'Project not owned by user',
  REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource not found',
  VALUE_NO_NEWLINES: 'Value cannot contain newlines',
  VALUE_REQUIRED: 'Value cannot be empty', // API-layer
  VALUE_TOO_LONG: `Value must be at most ${TRANSLATION_VALUE_MAX_LENGTH} characters`, // API-layer
} as const;

/**
 * Default query parameters for key listings.
 *
 * @type {Readonly<{LIMIT: number, MISSING_ONLY: boolean, OFFSET: number, SEARCH: undefined}>}
 */
export const KEYS_DEFAULT_PARAMS = {
  LIMIT: KEYS_DEFAULT_LIMIT,
  MISSING_ONLY: false,
  OFFSET: KEYS_MIN_OFFSET,
  SEARCH: undefined,
} as const;
