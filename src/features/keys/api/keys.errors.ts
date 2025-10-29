import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { KEYS_CONSTRAINTS, KEYS_ERROR_MESSAGES, KEYS_PG_ERROR_CODES } from '@/shared/constants';
import { createApiErrorResponse, parseErrorDetail } from '@/shared/utils';

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors using structured error details
 * that follow the format: error_code:ERROR_NAME,field:field_name,additional:metadata
 *
 * Handles all key-related errors including:
 * - Unique constraint violations (duplicate keys)
 * - Check constraint violations (format validation)
 * - Trigger violations (prefix validation, empty default value, fan-out failures)
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
        return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.DEFAULT_VALUE_EMPTY, {
          field: error.field,
          locale: error.locale,
          parsedDetails: error,
        });
      case 'FANOUT_FAILED':
        return createApiErrorResponse(500, KEYS_ERROR_MESSAGES.FANOUT_FAILED, {
          code: 'FANOUT_FAILED',
          expected: error.expected,
          inserted: error.inserted,
          keyId: error.key_id,
          parsedDetails: error,
        });
      case 'INVALID_FORMAT':
        return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.INVALID_FORMAT, {
          field: error.field,
          parsedDetails: error,
        });
      case 'KEY_INVALID_PREFIX':
        return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.KEY_INVALID_PREFIX, {
          expectedPrefix: error.expected_prefix,
          field: error.field,
          parsedDetails: error,
        });
      default:
        // if error code is not recognized, fall through to other handlers
        break;
    }
  }

  // handle errors based on PostgreSQL error code (fallback for non-structured errors)
  if (postgrestError.code === KEYS_PG_ERROR_CODES.UNIQUE_VIOLATION) {
    if (postgrestError.message.includes(KEYS_CONSTRAINTS.UNIQUE_PER_PROJECT)) {
      return createApiErrorResponse(409, KEYS_ERROR_MESSAGES.KEY_ALREADY_EXISTS);
    }
  }

  // handle trigger violations (fallback for non-structured errors)
  if (postgrestError.message.includes('must start with project prefix')) {
    return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.KEY_INVALID_PREFIX);
  }
  if (
    postgrestError.message.includes('cannot be NULL or empty') ||
    postgrestError.message.toLowerCase().includes('default_locale')
  ) {
    return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.DEFAULT_VALUE_EMPTY);
  }

  // handle check constraint violations
  if (postgrestError.code === KEYS_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.INVALID_FIELD_VALUE, {
      constraint: postgrestError.details,
      field: error.field,
    });
  }

  // handle foreign key violations
  if (postgrestError.code === KEYS_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    if (postgrestError.message.includes(KEYS_CONSTRAINTS.PROJECT_ID_FKEY)) {
      return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.INVALID_PROJECT_ID);
    }
    return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.REFERENCED_RESOURCE_NOT_FOUND);
  }

  // handle authorization errors (project not found or not owned)
  if (postgrestError.message.includes('not found') || postgrestError.message.includes('access denied')) {
    return createApiErrorResponse(403, KEYS_ERROR_MESSAGES.PROJECT_NOT_OWNED);
  }

  // build the details object conditionally
  const detailsObject: Record<string, unknown> = { original: postgrestError };
  if (Object.keys(error).length > 0) {
    detailsObject.parsedDetails = error;
  }

  // generic database error
  return createApiErrorResponse(500, fallbackMessage || KEYS_ERROR_MESSAGES.DATABASE_ERROR, detailsObject);
}
