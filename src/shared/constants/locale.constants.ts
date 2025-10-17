/**
 * Locale Constants and Validation Patterns
 *
 * Centralized definitions for locale validation patterns to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL domain constraints.
 *
 * All patterns follow BCP-47 subset: ll or ll-CC format only.
 */

import type { LocaleCode } from '@/shared/types';

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
    if (/.*-.*-.*/.test(locale)) return false; // Max one dash
    return true;
  },

  /** Pattern for language-country format (needs normalization) */
  LANGUAGE_COUNTRY: /^([a-zA-Z]{2})-([a-zA-Z]{2})$/,

  /** Pattern for language-only format */
  LANGUAGE_ONLY: /^[a-zA-Z]{2}$/,

  /**
   * Normalize function (TypeScript implementation)
   * Converts locale to database format: language lowercase, region uppercase
   * Examples: "en-us" -> "en-US", "PL" -> "pl", "EN-GB" -> "en-GB"
   */
  normalize: (locale: string): string => {
    if (!locale) return locale;

    if (LOCALE_NORMALIZATION.LANGUAGE_COUNTRY.test(locale)) {
      const match = locale.match(LOCALE_NORMALIZATION.LANGUAGE_COUNTRY);
      if (match) {
        const [, lang, country] = match;
        return `${lang.toLowerCase()}-${country.toUpperCase()}`;
      }
    }
    if (LOCALE_NORMALIZATION.LANGUAGE_ONLY.test(locale)) {
      return locale.toLowerCase();
    }
    return locale; // Return as-is if doesn't match expected patterns
  },
};

/**
 * Common locale codes for reference and testing
 */
export const COMMON_LOCALE_CODES = {
  ENGLISH: 'en',
  ENGLISH_GB: 'en-GB',
  ENGLISH_US: 'en-US',
  FRENCH: 'fr',
  FRENCH_FR: 'fr-FR',
  GERMAN: 'de',
  GERMAN_DE: 'de-DE',
  POLISH: 'pl',
  POLISH_PL: 'pl-PL',
  SPANISH: 'es',
  SPANISH_ES: 'es-ES',
  SPANISH_MX: 'es-MX',
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

/**
 * Creates a branded LocaleCode from a string with validation
 * Throws error if locale is invalid
 */
export function createLocaleCode(locale: string): LocaleCode {
  const normalized = LOCALE_NORMALIZATION.normalize(locale);
  if (!isValidLocaleCode(normalized)) {
    throw new Error(LOCALE_ERROR_MESSAGES.INVALID_FORMAT);
  }
  return normalized as LocaleCode;
}

/**
 * Type guard that also serves as type assertion for LocaleCode
 */
export function isLocaleCode(locale: string): locale is LocaleCode {
  return isValidLocaleCode(locale);
}

/**
 * Type guard to check if string is a valid locale code
 */
export function isValidLocaleCode(locale: string): boolean {
  return LOCALE_CODE_PATTERN.test(locale) && locale.length <= LOCALE_CODE_MAX_LENGTH;
}

/**
 * Type guard to check if string could be a valid locale code (before normalization)
 */
export function isValidLocaleInput(locale: string): boolean {
  return LOCALE_CODE_INPUT_PATTERN.test(locale) && locale.length <= LOCALE_CODE_MAX_LENGTH;
}
