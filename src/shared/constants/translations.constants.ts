/**
 * Translations Constants and Validation Patterns
 *
 * Centralized definitions for translation validation patterns to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL domain constraints.
 */

// Re-export translation value constraints from keys constants for consistency
import { KEY_VALIDATION, TRANSLATION_VALUE_MAX_LENGTH, TRANSLATION_VALUE_MIN_LENGTH } from './keys.constants';

export { TRANSLATION_VALUE_MAX_LENGTH, TRANSLATION_VALUE_MIN_LENGTH };

// Update source values
export const TRANSLATIONS_UPDATE_SOURCE_VALUES = ['user', 'system'] as const;
export type UpdateSourceType = (typeof TRANSLATIONS_UPDATE_SOURCE_VALUES)[number];

// PostgreSQL error codes relevant to translations
export const TRANSLATIONS_PG_ERROR_CODES = {
  /** Check constraint violation */
  CHECK_VIOLATION: '23514',
  /** Foreign key violation */
  FOREIGN_KEY_VIOLATION: '23503',
  /** Unique constraint violation */
  UNIQUE_VIOLATION: '23505',
} as const;

// Database constraint names for translations
export const TRANSLATIONS_CONSTRAINTS = {
  KEY_ID_FKEY: 'translations_key_id_fkey',
  PRIMARY_KEY: 'translations_pkey',
  PROJECT_ID_FKEY: 'translations_project_id_fkey',
  PROJECT_LOCALE_FKEY: 'translations_project_id_locale_fkey',
} as const;

// Error messages for translations validation
export const TRANSLATIONS_ERROR_MESSAGES = {
  DATABASE_ERROR: 'Database operation failed',
  DEFAULT_LOCALE_EMPTY: 'Default locale value cannot be empty',
  INVALID_FIELD_VALUE: 'Invalid field value',
  INVALID_UPDATE_SOURCE: 'Update source must be "user" or "system"',
  NO_DATA_RETURNED: 'No data returned from server',
  OPTIMISTIC_LOCK_FAILED: 'Translation was modified by another user. Please refresh and try again.',
  PROJECT_NOT_OWNED: 'Project not owned by user',
  REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource not found',
  TRANSLATION_NOT_FOUND: 'Translation not found',
  VALUE_NO_NEWLINES: 'Translation value cannot contain newlines',
  VALUE_REQUIRED: 'Translation value cannot be empty',
  VALUE_TOO_LONG: `Translation value must be at most ${TRANSLATION_VALUE_MAX_LENGTH} characters`,
} as const;

// Validation utilities
export const TRANSLATION_VALIDATION = {
  /**
   * Check if update source is valid
   */
  isValidUpdateSource: (source: string): source is UpdateSourceType => {
    return TRANSLATIONS_UPDATE_SOURCE_VALUES.includes(source as UpdateSourceType);
  },

  /**
   * Validate translation value (client-side)
   * Same rules as KEY_VALIDATION.isValidTranslationValue
   */
  isValidValue: KEY_VALIDATION.isValidTranslationValue,

  /**
   * Sanitize translation value
   * Trims whitespace and ensures valid format
   */
  sanitizeValue: (value: string): string => {
    if (!value || typeof value !== 'string') {
      return '';
    }
    return value.trim();
  },
};
