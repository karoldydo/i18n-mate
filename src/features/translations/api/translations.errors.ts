import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { TRANSLATIONS_ERROR_MESSAGES, TRANSLATIONS_PG_ERROR_CODES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors including:
 * - Foreign key violations (23503)
 * - Check constraint violations (23514)
 * - Trigger violations (default locale validation)
 *
 * @param error - PostgrestError from Supabase
 * @param context - Optional context string for logging (e.g., hook name)
 * @param fallbackMessage - Optional custom fallback message for generic errors
 * @returns Standardized ApiErrorResponse object
 */
export function createDatabaseErrorResponse(
  error: PostgrestError,
  context?: string,
  fallbackMessage?: string
): ApiErrorResponse {
  const logPrefix = context ? `[${context}]` : '[handleDatabaseError]';
  console.error(`${logPrefix} Database error:`, error);

  // Handle trigger violations (default locale validation)
  if (error.message.includes('cannot be NULL or empty') || error.message.toLowerCase().includes('default_locale')) {
    return createApiErrorResponse(400, TRANSLATIONS_ERROR_MESSAGES.DEFAULT_LOCALE_EMPTY);
  }

  // Handle check constraint violations
  if (error.code === TRANSLATIONS_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, TRANSLATIONS_ERROR_MESSAGES.INVALID_FIELD_VALUE, {
      constraint: error.details,
    });
  }

  // Handle foreign key violations
  if (error.code === TRANSLATIONS_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return createApiErrorResponse(404, TRANSLATIONS_ERROR_MESSAGES.REFERENCED_RESOURCE_NOT_FOUND);
  }

  // Handle authorization errors (project not found or not owned)
  if (error.message.includes('not found') || error.message.includes('access denied')) {
    return createApiErrorResponse(403, TRANSLATIONS_ERROR_MESSAGES.PROJECT_NOT_OWNED);
  }

  // Generic database error
  return createApiErrorResponse(500, fallbackMessage || TRANSLATIONS_ERROR_MESSAGES.DATABASE_ERROR, {
    original: error,
  });
}
