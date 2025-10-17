/**
 * Locale Validation Utilities
 *
 * Provides both client-side and server-side validation for locale codes
 * to ensure consistency between frontend and database validation rules.
 */

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
export function isValidLocaleFormatClient(locale: string): boolean {
  if (!locale || typeof locale !== 'string') return false;
  if (locale.length > 5) return false;
  if (!/^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/.test(locale)) return false;
  if (/.*-.*-.*/.test(locale)) return false; // Max one dash
  return true;
}

/**
 * Normalizes locale code to database format
 * - Language part: lowercase (en, pl)
 * - Region part: uppercase (US, PL)
 *
 * Examples:
 * - "en-us" -> "en-US"
 * - "PL" -> "pl"
 * - "EN-GB" -> "en-GB"
 */
export function normalizeLocaleCode(locale: string): string {
  if (!locale) return locale;

  if (locale.includes('-')) {
    const [language, region] = locale.split('-');
    return `${language.toLowerCase()}-${region.toUpperCase()}`;
  }

  return locale.toLowerCase();
}
