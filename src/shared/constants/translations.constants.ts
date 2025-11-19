import { TRANSLATION_VALUE_MAX_LENGTH, TRANSLATION_VALUE_MIN_LENGTH } from './keys.constants';

// re-export translation value constraints from keys constants for consistency
export { TRANSLATION_VALUE_MAX_LENGTH, TRANSLATION_VALUE_MIN_LENGTH };

/**
 * Valid values for translation update source field.
 *
 * @type {ReadonlyArray<string>}
 */
export const TRANSLATIONS_UPDATE_SOURCE_VALUES = ['user', 'system'] as const;

/**
 * PostgreSQL error codes relevant to translations operations.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const TRANSLATIONS_PG_ERROR_CODES = {
  CHECK_VIOLATION: '23514',
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
} as const;

/**
 * Database constraint names for translations.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const TRANSLATIONS_CONSTRAINTS = {
  KEY_ID_FKEY: 'translations_key_id_fkey',
  PRIMARY_KEY: 'translations_pkey',
  PROJECT_ID_FKEY: 'translations_project_id_fkey',
  PROJECT_LOCALE_FKEY: 'translations_project_id_locale_fkey',
} as const;

/**
 * Error messages for translations validation.
 *
 * Note: Some error messages are API-layer only (client-side validation),
 * while others map directly to database error codes from migrations.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const TRANSLATIONS_ERROR_MESSAGES = {
  DATABASE_ERROR: 'Database operation failed',
  DEFAULT_LOCALE_EMPTY: 'Default locale value cannot be empty',
  INVALID_FIELD_VALUE: 'Invalid field value', // API-layer
  INVALID_UPDATE_SOURCE: 'Update source must be "user" or "system"', // API-layer
  NO_DATA_RETURNED: 'No data returned from server', // API-layer
  OPTIMISTIC_LOCK_FAILED: 'Translation was modified by another user. Please refresh and try again.', // API-layer
  PROJECT_NOT_OWNED: 'Project not owned by user', // API-layer
  REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource not found', // API-layer
  TRANSLATION_NOT_FOUND: 'Translation not found', // API-layer
  VALUE_NO_NEWLINES: 'Translation value cannot contain newlines',
  VALUE_REQUIRED: 'Translation value cannot be empty', // API-layer
  VALUE_TOO_LONG: `Translation value must be at most ${TRANSLATION_VALUE_MAX_LENGTH} characters`, // API-layer
} as const;
