/**
 * Locale Constants and Validation Patterns
 *
 * Centralized definitions for locale validation patterns to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL domain constraints.
 *
 * All patterns follow BCP-47 subset: ll or ll-CC format only.
 */

/**
 * BCP-47 locale pattern - matches ll or ll-CC format only
 * Examples: en, en-US, pl, pl-PL, es, es-ES
 *
 * Pattern breakdown:
 * - ^[a-z]{2} : exactly 2 lowercase letters (language code)
 * - (-[A-Z]{2})? : optionally followed by dash and 2 uppercase letters (country code)
 * - $ : end of string
 *
 * Note: This pattern expects normalized input (language lowercase, country uppercase)
 */
export const LOCALE_CODE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

/**
 * Raw locale pattern for input validation (before normalization)
 * Accepts mixed case input that will be normalized by database triggers
 * Examples: en, EN, en-us, EN-US, En-Us
 */
export const LOCALE_CODE_INPUT_PATTERN = /^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/;

/**
 * PostgreSQL domain constraint pattern (used in migrations)
 * Must match LOCALE_CODE_PATTERN exactly for consistency
 */
export const LOCALE_CODE_DOMAIN_PATTERN = '^[a-z]{2}(-[A-Z]{2})?$';

/**
 * Maximum length for locale code (BCP-47 ll-CC format)
 */
export const LOCALE_CODE_MAX_LENGTH = 5;

/**
 * Maximum length for locale label (human-readable name)
 */
export const LOCALE_LABEL_MAX_LENGTH = 64;

/**
 * Locale normalization patterns and utilities
 */
const MULTIPLE_REGION_SEPARATOR_PATTERN = /.*-.*-.*/;
const LANGUAGE_COUNTRY_PATTERN = /^([a-zA-Z]{2})-([a-zA-Z]{2})$/;
const LANGUAGE_ONLY_PATTERN = /^[a-zA-Z]{2}$/;

const normalizeLocale = (locale: string): string => {
  if (!locale) return locale;

  if (LANGUAGE_COUNTRY_PATTERN.test(locale)) {
    const match = locale.match(LANGUAGE_COUNTRY_PATTERN);
    if (match) {
      const [, language, region] = match;
      return `${language.toLowerCase()}-${region.toUpperCase()}`;
    }
  }

  if (LANGUAGE_ONLY_PATTERN.test(locale)) {
    return locale.toLowerCase();
  }

  return locale;
};

export const LOCALE_NORMALIZATION = {
  /**
   * Client-side locale validation (matches database rules)
   * Use for immediate feedback, but always verify server-side for critical operations
   *
   * Rules implemented:
   * - Must be 2-5 characters long
   * - Format: ll or ll-CC (language-country)
   * - Only letters and one dash allowed
   * - Maximum one dash (no multiple regions)
   */
  isValidFormatClient: (locale: string): boolean => {
    if (!locale || typeof locale !== 'string') return false;
    if (locale.length > LOCALE_CODE_MAX_LENGTH) return false;
    if (!LOCALE_CODE_INPUT_PATTERN.test(locale)) return false;
    if (MULTIPLE_REGION_SEPARATOR_PATTERN.test(locale)) return false; // Max one dash
    const normalized = normalizeLocale(locale);
    return LOCALE_CODE_PATTERN.test(normalized);
  },

  /** Pattern for language-country format (needs normalization) */
  LANGUAGE_COUNTRY: LANGUAGE_COUNTRY_PATTERN,

  /** Pattern for language-only format */
  LANGUAGE_ONLY: LANGUAGE_ONLY_PATTERN,

  /**
   * Normalize function (TypeScript implementation)
   * Converts locale to database format: language lowercase, region uppercase
   * Examples: "en-us" -> "en-US", "PL" -> "pl", "EN-GB" -> "en-GB"
   */
  normalize: normalizeLocale,
};

/**
 * PostgreSQL error codes relevant to locale operations
 */
export const LOCALE_PG_ERROR_CODES = {
  /** Check constraint violation */
  CHECK_VIOLATION: '23514',
  /** Foreign key violation */
  FOREIGN_KEY_VIOLATION: '23503',
  /** Unique constraint violation */
  UNIQUE_VIOLATION: '23505',
} as const;

/**
 * Database constraint names for locales
 */
export const LOCALE_CONSTRAINTS = {
  UNIQUE_PER_PROJECT: 'idx_project_locales_project_locale_unique',
} as const;

/**
 * Error messages for locale validation
 */
export const LOCALE_ERROR_MESSAGES = {
  ALREADY_EXISTS: 'Locale already exists for this project',
  INVALID_FORMAT: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
  LABEL_REQUIRED: 'Locale label is required',
  LABEL_TOO_LONG: `Locale label must be at most ${LOCALE_LABEL_MAX_LENGTH} characters`,
  TOO_LONG: `Locale code must be at most ${LOCALE_CODE_MAX_LENGTH} characters`,
} as const;
