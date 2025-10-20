import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { KEYS_CONSTRAINTS, KEYS_ERROR_MESSAGES, KEYS_PG_ERROR_CODES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors including:
 * - Unique constraint violations (23505)
 * - Check constraint violations (23514)
 * - Trigger violations (prefix validation, empty default value)
 *
 * @param error - PostgrestError from Supabase
 * @param context - Optional context string for logging (e.g., hook name)
 * @param fallbackMessage - Optional custom fallback message for generic errors
 *
 * @returns Standardized ApiErrorResponse object
 */
export function createDatabaseErrorResponse(
  error: PostgrestError,
  context?: string,
  fallbackMessage?: string
): ApiErrorResponse {
  const logPrefix = context ? `[${context}]` : '[handleDatabaseError]';
  console.error(`${logPrefix} Database error:`, error);

  // handle unique constraint violations
  if (error.code === KEYS_PG_ERROR_CODES.UNIQUE_VIOLATION) {
    if (error.message.includes(KEYS_CONSTRAINTS.UNIQUE_PER_PROJECT)) {
      return createApiErrorResponse(409, KEYS_ERROR_MESSAGES.KEY_ALREADY_EXISTS);
    }
  }

  // handle trigger violations
  if (error.message.includes('must start with project prefix')) {
    return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.KEY_INVALID_PREFIX);
  }
  if (error.message.includes('cannot be NULL or empty') || error.message.toLowerCase().includes('default_locale')) {
    return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.DEFAULT_VALUE_EMPTY);
  }

  // handle check constraint violations
  if (error.code === KEYS_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.INVALID_FIELD_VALUE, { constraint: error.details });
  }

  // handle foreign key violations
  if (error.code === KEYS_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    if (error.message.includes(KEYS_CONSTRAINTS.PROJECT_ID_FKEY)) {
      return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.INVALID_PROJECT_ID);
    }
    return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.REFERENCED_RESOURCE_NOT_FOUND);
  }

  // handle authorization errors (project not found or not owned)
  if (error.message.includes('not found') || error.message.includes('access denied')) {
    return createApiErrorResponse(403, KEYS_ERROR_MESSAGES.PROJECT_NOT_OWNED);
  }

  // generic database error
  return createApiErrorResponse(500, fallbackMessage || KEYS_ERROR_MESSAGES.DATABASE_ERROR, { original: error });
}
