import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { TRANSLATIONS_ERROR_MESSAGES, TRANSLATIONS_PG_ERROR_CODES } from '@/shared/constants';
import { createApiErrorResponse, parseErrorDetail } from '@/shared/utils';

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors using structured error details
 * that follow the format: error_code:ERROR_NAME,field:field_name,additional:metadata
 *
 * Handles all translation-related errors including:
 * - Foreign key violations (23503) - referenced resource not found
 * - Check constraint violations (23514) - invalid field values
 * - Trigger violations - default locale validation (cannot be NULL or empty)
 * - Authentication and authorization errors - project not owned or access denied
 *
 * Error handling priority:
 * 1. Structured error codes from DETAIL field (e.g., DEFAULT_VALUE_EMPTY)
 * 2. Trigger violations detected from error message
 * 3. PostgreSQL error codes (check violations, foreign key violations)
 * 4. Authorization errors detected from message patterns
 * 5. Generic database errors with fallback message
 *
 * @param postgrestError - PostgrestError from Supabase containing code, message, and details
 * @param context - Optional context string for logging (e.g., hook name)
 * @param fallbackMessage - Optional custom fallback message for generic errors (defaults to DATABASE_ERROR)
 *
 * @returns Standardized ApiErrorResponse object with appropriate status code and message
 *
 * @throws Never throws - always returns ApiErrorResponse object
 */
export function createDatabaseErrorResponse(
  postgrestError: PostgrestError,
  context?: string,
  fallbackMessage?: string
): ApiErrorResponse {
  const logPrefix = context ? `[${context}]` : '[handleDatabaseError]';
  console.error(`${logPrefix} Database error:`, postgrestError);

  // parse structured error details if available
  let error: Record<string, string> = {};
  if (postgrestError.details) {
    error = parseErrorDetail(postgrestError.details);
  }

  // handle errors based on structured error code from DETAIL field first
  if (error.error_code) {
    switch (error.error_code) {
      case 'DEFAULT_VALUE_EMPTY':
        return createApiErrorResponse(400, TRANSLATIONS_ERROR_MESSAGES.DEFAULT_LOCALE_EMPTY, {
          field: error.field,
          locale: error.locale,
          parsedDetails: error,
        });
      default:
        // if error code is not recognized, fall through to other handlers
        break;
    }
  }

  // handle trigger violations (fallback for non-structured errors)
  if (
    postgrestError.message.includes('cannot be NULL or empty') ||
    postgrestError.message.toLowerCase().includes('default_locale')
  ) {
    return createApiErrorResponse(400, TRANSLATIONS_ERROR_MESSAGES.DEFAULT_LOCALE_EMPTY);
  }

  // handle check constraint violations
  if (postgrestError.code === TRANSLATIONS_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, TRANSLATIONS_ERROR_MESSAGES.INVALID_FIELD_VALUE, {
      constraint: postgrestError.details,
      field: error.field,
    });
  }

  // handle foreign key violations
  if (postgrestError.code === TRANSLATIONS_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return createApiErrorResponse(404, TRANSLATIONS_ERROR_MESSAGES.REFERENCED_RESOURCE_NOT_FOUND);
  }

  // handle authorization errors (project not found or not owned)
  if (postgrestError.message.includes('not found') || postgrestError.message.includes('access denied')) {
    return createApiErrorResponse(403, TRANSLATIONS_ERROR_MESSAGES.PROJECT_NOT_OWNED);
  }

  // build the details object conditionally
  const detailsObject: Record<string, unknown> = { original: postgrestError };
  if (Object.keys(error).length > 0) {
    detailsObject.parsedDetails = error;
  }

  // generic database error
  return createApiErrorResponse(500, fallbackMessage || TRANSLATIONS_ERROR_MESSAGES.DATABASE_ERROR, detailsObject);
}
