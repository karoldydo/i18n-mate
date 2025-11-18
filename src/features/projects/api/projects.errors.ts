import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { PROJECTS_CONSTRAINTS, PROJECTS_ERROR_MESSAGES, PROJECTS_PG_ERROR_CODES } from '@/shared/constants';
import { createApiErrorResponse, parseErrorDetail } from '@/shared/utils';

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors using structured error details
 * that follow the format: error_code:ERROR_NAME,field:field_name,additional:metadata
 *
 * @param {PostgrestError} postgrestError - PostgrestError from Supabase
 * @param {string} [context] - Optional context string for logging (e.g., hook name)
 * @param {string} [fallbackMessage] - Optional custom fallback message for generic errors
 *
 * @returns {ApiErrorResponse} Standardized ApiErrorResponse object
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

  // handle errors based on structured error code from DETAIL field
  if (error.error_code) {
    switch (error.error_code) {
      case 'AUTHENTICATION_REQUIRED':
        return createApiErrorResponse(401, PROJECTS_ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
      case 'DEFAULT_LOCALE_CANNOT_DELETE':
        return createApiErrorResponse(400, PROJECTS_ERROR_MESSAGES.DEFAULT_LOCALE_CANNOT_DELETE);
      case 'DEFAULT_LOCALE_IMMUTABLE':
        return createApiErrorResponse(400, PROJECTS_ERROR_MESSAGES.DEFAULT_LOCALE_IMMUTABLE);
      case 'DUPLICATE_CONSTRAINT':
        return createApiErrorResponse(409, PROJECTS_ERROR_MESSAGES.DUPLICATE_CONSTRAINT);
      case 'DUPLICATE_PROJECT_NAME':
        return createApiErrorResponse(409, PROJECTS_ERROR_MESSAGES.PROJECT_NAME_EXISTS);
      case 'DUPLICATE_PROJECT_PREFIX':
        return createApiErrorResponse(409, PROJECTS_ERROR_MESSAGES.PREFIX_ALREADY_IN_USE);
      case 'PREFIX_IMMUTABLE':
        return createApiErrorResponse(400, PROJECTS_ERROR_MESSAGES.PREFIX_IMMUTABLE);
      case 'PROJECT_ACCESS_DENIED':
        return createApiErrorResponse(403, PROJECTS_ERROR_MESSAGES.PROJECT_ACCESS_DENIED);
      case 'PROJECT_CREATION_FAILED':
        return createApiErrorResponse(500, PROJECTS_ERROR_MESSAGES.PROJECT_CREATION_FAILED);
      default:
        // if error code is not recognized, fall through to other handlers
        break;
    }
  }

  // handle errors based on PostgreSQL error code
  if (postgrestError.code === PROJECTS_PG_ERROR_CODES.UNIQUE_VIOLATION) {
    if (postgrestError.message.includes(PROJECTS_CONSTRAINTS.NAME_UNIQUE_PER_OWNER)) {
      return createApiErrorResponse(409, PROJECTS_ERROR_MESSAGES.PROJECT_NAME_EXISTS);
    }
    if (postgrestError.message.includes(PROJECTS_CONSTRAINTS.PREFIX_UNIQUE_PER_OWNER)) {
      return createApiErrorResponse(409, PROJECTS_ERROR_MESSAGES.PREFIX_ALREADY_IN_USE);
    }
  }

  // handle trigger violations (immutable fields)
  if (postgrestError.message.includes('prefix')) {
    return createApiErrorResponse(400, PROJECTS_ERROR_MESSAGES.PREFIX_IMMUTABLE);
  }
  if (postgrestError.message.includes('default_locale')) {
    return createApiErrorResponse(400, PROJECTS_ERROR_MESSAGES.DEFAULT_LOCALE_IMMUTABLE);
  }

  // handle check constraint violations
  if (postgrestError.code === PROJECTS_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, PROJECTS_ERROR_MESSAGES.INVALID_FIELD_VALUE, {
      constraint: postgrestError.details,
      field: error.field,
    });
  }

  // handle foreign key violations
  if (postgrestError.code === PROJECTS_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return createApiErrorResponse(404, PROJECTS_ERROR_MESSAGES.REFERENCED_RESOURCE_NOT_FOUND);
  }

  // build the details object conditionally
  const detailsObject: Record<string, unknown> = { original: postgrestError };
  if (Object.keys(error).length > 0) {
    detailsObject.parsedDetails = error;
  }

  // generic database error (generic errors should come last, after specific checks)
  return createApiErrorResponse(500, fallbackMessage || PROJECTS_ERROR_MESSAGES.DATABASE_ERROR, detailsObject);
}
