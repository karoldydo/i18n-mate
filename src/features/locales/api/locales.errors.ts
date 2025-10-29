import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { LOCALE_CONSTRAINTS, LOCALE_ERROR_MESSAGES, LOCALE_PG_ERROR_CODES } from '@/shared/constants';
import { createApiErrorResponse, parseErrorDetail } from '@/shared/utils';

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors using structured error details
 * that follow the format: error_code:ERROR_NAME,field:field_name,additional:metadata
 *
 * Handles all locale-related errors including:
 * - Atomic locale creation errors (fan-out failures, verification issues)
 * - Standard database errors (unique violations, check violations, etc.)
 * - Authentication and authorization errors
 *
 * @param postgrestError - PostgrestError from Supabase
 * @param context - Optional context string for logging (e.g., hook name)
 * @param fallbackMessage - Optional custom fallback message for generic errors
 * @returns Standardized ApiErrorResponse object
 */
export function createDatabaseErrorResponse(
  postgrestError: PostgrestError,
  context?: string,
  fallbackMessage?: string
): ApiErrorResponse {
  const LOG_PREFIX = context ? `[${context}]` : '[handleDatabaseError]';
  console.error(`${LOG_PREFIX} Database error:`, postgrestError);

  // parse structured error details if available
  let error: Record<string, string> = {};
  if (postgrestError.details) {
    error = parseErrorDetail(postgrestError.details);
  }

  // handle errors based on structured error code from DETAIL field first
  if (error.error_code) {
    switch (error.error_code) {
      case 'AUTHENTICATION_REQUIRED':
        return createApiErrorResponse(401, LOCALE_ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
      case 'DEFAULT_LOCALE_CANNOT_DELETE':
        return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.DEFAULT_LOCALE_CANNOT_DELETE);
      case 'DEFAULT_LOCALE_DUPLICATE':
        return createApiErrorResponse(409, LOCALE_ERROR_MESSAGES.DEFAULT_LOCALE_DUPLICATE);
      case 'DUPLICATE_LOCALE':
        return createApiErrorResponse(409, LOCALE_ERROR_MESSAGES.ALREADY_EXISTS);
      case 'FANOUT_INCOMPLETE':
        return createApiErrorResponse(500, LOCALE_ERROR_MESSAGES.FANOUT_INCOMPLETE, {
          code: 'FANOUT_INCOMPLETE',
          parsedDetails: error,
        });
      case 'FANOUT_VERIFICATION_FAILED':
        return createApiErrorResponse(500, LOCALE_ERROR_MESSAGES.FANOUT_VERIFICATION_FAILED, {
          code: 'FANOUT_VERIFICATION_FAILED',
          details: postgrestError.details,
          parsedDetails: error,
        });
      case 'FIELD_REQUIRED':
        return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.FIELD_REQUIRED, {
          field: error.field,
          parsedDetails: error,
        });
      case 'INVALID_CHARACTERS':
        return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.INVALID_CHARACTERS, {
          field: error.field,
          parsedDetails: error,
        });
      case 'INVALID_FORMAT':
        return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.INVALID_FORMAT, {
          constraint: postgrestError.details,
          field: error.field,
          parsedDetails: error,
        });
      case 'INVALID_LOCALE_FORMAT':
        return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.INVALID_FORMAT, {
          constraint: postgrestError.details,
          field: error.field,
          parsedDetails: error,
        });
      case 'LOCALE_IS_LANGUAGE_NAME':
        return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.LOCALE_IS_LANGUAGE_NAME, {
          field: error.field,
          parsedDetails: error,
        });
      case 'LOCALE_NOT_FOUND':
        return createApiErrorResponse(404, LOCALE_ERROR_MESSAGES.LOCALE_NOT_FOUND);
      case 'MAX_LENGTH_EXCEEDED':
        return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.MAX_LENGTH_EXCEEDED, {
          field: error.field,
          maxLength: error.max_length,
          parsedDetails: error,
        });
      case 'TOO_LONG':
        return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.TOO_LONG, {
          field: error.field,
          parsedDetails: error,
        });
      case 'TOO_MANY_DASHES':
        return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.TOO_MANY_DASHES, {
          field: error.field,
          parsedDetails: error,
        });
      default:
        // If error code is not recognized, fall through to other handlers
        break;
    }
  }

  // handle atomic-specific error cases that might not have structured error codes
  // fan-out verification failures (fallback for non-structured errors)
  if (postgrestError.message.includes(LOCALE_ERROR_MESSAGES.FANOUT_VERIFICATION_FAILED_MESSAGE)) {
    return createApiErrorResponse(500, LOCALE_ERROR_MESSAGES.FANOUT_VERIFICATION_FAILED, {
      code: 'FANOUT_VERIFICATION_FAILED',
      details: postgrestError.details,
    });
  }

  // fan-out incomplete errors (fallback for non-structured errors)
  if (postgrestError.message.includes(LOCALE_ERROR_MESSAGES.FANOUT_INCOMPLETE_MESSAGE)) {
    const EXPECTED_MATCH = postgrestError.message.match(/expected (\d+)/);
    const INSERTED_MATCH = postgrestError.message.match(/inserted (\d+)/);

    return createApiErrorResponse(500, LOCALE_ERROR_MESSAGES.FANOUT_INCOMPLETE, {
      actual: INSERTED_MATCH?.[1] ? parseInt(INSERTED_MATCH[1], 10) : undefined,
      code: 'FANOUT_INCOMPLETE',
      expected: EXPECTED_MATCH?.[1] ? parseInt(EXPECTED_MATCH[1], 10) : undefined,
    });
  }

  // authentication failures (fallback for non-structured errors)
  if (postgrestError.message.includes(LOCALE_ERROR_MESSAGES.AUTHENTICATION_REQUIRED)) {
    return createApiErrorResponse(401, LOCALE_ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
  }

  // project access failures (fallback for non-structured errors)
  if (postgrestError.message.includes(LOCALE_ERROR_MESSAGES.PROJECT_NOT_FOUND)) {
    return createApiErrorResponse(404, LOCALE_ERROR_MESSAGES.PROJECT_ACCESS_DENIED);
  }

  // fan-out trigger general failures (fallback for non-structured errors)
  if (postgrestError.message.includes(LOCALE_ERROR_MESSAGES.FAILED_TO_CREATE_TRANSLATIONS_MESSAGE)) {
    return createApiErrorResponse(500, LOCALE_ERROR_MESSAGES.LOCALE_CREATION_FAILED, {
      code: 'FANOUT_TRIGGER_FAILED',
      hint: postgrestError.hint || 'Locale insertion failed due to translation fan-out error',
    });
  }

  // handle errors based on PostgreSQL error code
  if (postgrestError.code === LOCALE_PG_ERROR_CODES.UNIQUE_VIOLATION) {
    if (postgrestError.message.includes(LOCALE_CONSTRAINTS.UNIQUE_PER_PROJECT)) {
      return createApiErrorResponse(409, LOCALE_ERROR_MESSAGES.ALREADY_EXISTS);
    }
  }

  // handle trigger violations (default locale deletion)
  if (postgrestError.message.includes(LOCALE_ERROR_MESSAGES.LOCALE_CANNOT_DELETE_MESSAGE)) {
    return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.DEFAULT_LOCALE_CANNOT_DELETE);
  }

  // handle check constraint violations
  if (postgrestError.code === LOCALE_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.INVALID_FORMAT, {
      constraint: postgrestError.details,
      field: error.field,
    });
  }

  // handle foreign key violations
  if (postgrestError.code === LOCALE_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return createApiErrorResponse(404, LOCALE_ERROR_MESSAGES.PROJECT_NOT_FOUND);
  }

  // build the details object conditionally
  const detailsObject: Record<string, unknown> = { original: postgrestError };
  if (Object.keys(error).length > 0) {
    detailsObject.parsedDetails = error;
  }

  // generic database error
  return createApiErrorResponse(500, fallbackMessage || LOCALE_ERROR_MESSAGES.DATABASE_ERROR, detailsObject);
}
