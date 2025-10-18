/**
 * Keys Constants and Validation Patterns
 *
 * Centralized definitions for key validation patterns to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL domain constraints.
 *
 * All patterns follow project-specific key naming conventions.
 */

/**
 * Key format pattern - matches lowercase letters, numbers, dots, underscores, and hyphens
 * Examples: user.name, auth.login-error, profile_settings, nav.menu.items
 *
 * Pattern breakdown:
 * - ^[a-z0-9._-]+ : start with allowed characters
 * - $ : end of string
 *
 * Note: Additional validation prevents consecutive dots and trailing dots
 */
export const KEY_FORMAT_PATTERN = /^[a-z0-9._-]+$/;

/**
 * Pattern to detect consecutive dots (invalid)
 * Used for validation refinement
 */
export const CONSECUTIVE_DOTS_PATTERN = /\.\./;

/**
 * Pattern to detect trailing dots (invalid)
 * Used for validation refinement
 */
export const KEY_TRAILING_DOT_PATTERN = /\.$/;

/**
 * Maximum length for full key name (including prefix)
 */
export const KEY_NAME_MAX_LENGTH = 256;

/**
 * Minimum length for key name
 */
export const KEY_NAME_MIN_LENGTH = 1;

/**
 * Maximum length for translation value
 */
export const TRANSLATION_VALUE_MAX_LENGTH = 250;

/**
 * Minimum length for translation value
 */
export const TRANSLATION_VALUE_MIN_LENGTH = 1;

/**
 * Default pagination limit for key lists
 */
export const KEYS_DEFAULT_LIMIT = 50;

/**
 * Maximum pagination limit for key lists
 */
export const KEYS_MAX_LIMIT = 100;

/**
 * Minimum pagination offset
 */
export const KEYS_MIN_OFFSET = 0;

/**
 * PostgreSQL error codes relevant to keys operations
 */
export const KEYS_PG_ERROR_CODES = {
  /** Check constraint violation */
  CHECK_VIOLATION: '23514',
  /** Foreign key violation */
  FOREIGN_KEY_VIOLATION: '23503',
  /** Unique constraint violation */
  UNIQUE_VIOLATION: '23505',
} as const;

/**
 * Database constraint names for keys
 */
export const KEYS_CONSTRAINTS = {
  PROJECT_ID_FKEY: 'keys_project_id_fkey',
  UNIQUE_PER_PROJECT: 'keys_unique_per_project',
} as const;

/**
 * Key validation patterns and utilities
 */
export const KEY_VALIDATION = {
  /**
   * Build full key from prefix and name
   */
  buildFullKey: (prefix: string, keyName: string): string => {
    return `${prefix}.${keyName}`;
  },

  /**
   * Extract key name without prefix
   */
  extractKeyName: (fullKey: string, prefix: string): string => {
    if (!KEY_VALIDATION.startsWithPrefix(fullKey, prefix)) {
      return fullKey;
    }
    return fullKey.substring(prefix.length + 1);
  },

  /**
   * Client-side key format validation
   * Use for immediate feedback, but always verify server-side for critical operations
   *
   * Rules implemented:
   * - Must be 1-256 characters long
   * - Only lowercase letters, numbers, dots, underscores, and hyphens
   * - Cannot contain consecutive dots
   * - Cannot end with a dot
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
   * Validate translation value format
   * Checks length constraints and content rules
   */
  isValidTranslationValue: (value: string): boolean => {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (trimmed.length < TRANSLATION_VALUE_MIN_LENGTH || trimmed.length > TRANSLATION_VALUE_MAX_LENGTH) return false;
    if (trimmed.includes('\n')) return false; // No newlines allowed
    return true;
  },

  /**
   * Check if key starts with given prefix
   */
  startsWithPrefix: (key: string, prefix: string): boolean => {
    return key.startsWith(`${prefix}.`);
  },
};

/**
 * Error messages for key operations
 */
export const KEYS_ERROR_MESSAGES = {
  DATABASE_ERROR: 'Database operation failed',
  DEFAULT_VALUE_EMPTY: 'Default locale value cannot be empty',
  INVALID_FIELD_VALUE: 'Invalid field value',
  INVALID_PROJECT_ID: 'Invalid project_id',
  KEY_ALREADY_EXISTS: 'Key already exists in project',
  KEY_CONSECUTIVE_DOTS: 'Key cannot contain consecutive dots',
  KEY_INVALID_FORMAT: 'Key can only contain lowercase letters, numbers, dots, underscores, and hyphens',
  KEY_INVALID_PREFIX: 'Key must start with project prefix',
  KEY_NOT_FOUND: 'Key not found or access denied',
  KEY_REQUIRED: 'Key name is required',
  KEY_TOO_LONG: `Key name must be at most ${KEY_NAME_MAX_LENGTH} characters`,
  KEY_TRAILING_DOT: 'Key cannot end with a dot',
  NO_DATA_RETURNED: 'No data returned from server',
  PROJECT_NOT_OWNED: 'Project not owned by user',
  REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource not found',
  VALUE_NO_NEWLINES: 'Value cannot contain newlines',
  VALUE_REQUIRED: 'Value cannot be empty',
  VALUE_TOO_LONG: `Value must be at most ${TRANSLATION_VALUE_MAX_LENGTH} characters`,
} as const;

/**
 * Default query parameters for key listings
 */
export const KEYS_DEFAULT_PARAMS = {
  LIMIT: KEYS_DEFAULT_LIMIT,
  MISSING_ONLY: false,
  OFFSET: KEYS_MIN_OFFSET,
  SEARCH: undefined,
} as const;

/**
 * Creates a branded key name from a string with validation
 * Throws error if key format is invalid
 */
export function createKeyName(key: string): string {
  if (!KEY_VALIDATION.isValidFormatClient(key)) {
    throw new Error(KEYS_ERROR_MESSAGES.KEY_INVALID_FORMAT);
  }
  return key;
}

/**
 * Type guard that checks if string is a valid key format
 */
export function isValidKeyFormat(key: string): boolean {
  return KEY_VALIDATION.isValidFormatClient(key);
}

/**
 * Type guard that checks if string is a valid translation value
 */
export function isValidTranslationValue(value: string): boolean {
  return KEY_VALIDATION.isValidTranslationValue(value);
}

/**
 * Sanitize and normalize translation value
 * Trims whitespace and ensures valid format
 */
export function normalizeTranslationValue(value: string): string {
  if (!value || typeof value !== 'string') {
    throw new Error(KEYS_ERROR_MESSAGES.VALUE_REQUIRED);
  }

  const normalized = value.trim();

  if (!isValidTranslationValue(normalized)) {
    throw new Error(KEYS_ERROR_MESSAGES.VALUE_TOO_LONG);
  }

  return normalized;
}
