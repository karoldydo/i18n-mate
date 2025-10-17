import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { PROJECTS_CONSTRAINTS, PROJECTS_ERROR_MESSAGES, PROJECTS_PG_ERROR_CODES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors including:
 * - Unique constraint violations (23505)
 * - Check constraint violations (23514)
 * - Foreign key violations (23503)
 * - Trigger violations (immutable fields)
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

  // Handle unique constraint violations
  if (error.code === PROJECTS_PG_ERROR_CODES.UNIQUE_VIOLATION) {
    if (error.message.includes(PROJECTS_CONSTRAINTS.NAME_UNIQUE_PER_OWNER)) {
      return createApiErrorResponse(409, PROJECTS_ERROR_MESSAGES.PROJECT_NAME_EXISTS);
    }
    if (error.message.includes(PROJECTS_CONSTRAINTS.PREFIX_UNIQUE_PER_OWNER)) {
      return createApiErrorResponse(409, PROJECTS_ERROR_MESSAGES.PREFIX_ALREADY_IN_USE);
    }
  }

  // Handle trigger violations (immutable fields)
  if (error.message.includes('prefix')) {
    return createApiErrorResponse(400, PROJECTS_ERROR_MESSAGES.PREFIX_IMMUTABLE);
  }
  if (error.message.includes('default_locale')) {
    return createApiErrorResponse(400, PROJECTS_ERROR_MESSAGES.DEFAULT_LOCALE_IMMUTABLE);
  }

  // Handle check constraint violations
  if (error.code === PROJECTS_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, PROJECTS_ERROR_MESSAGES.INVALID_FIELD_VALUE, { constraint: error.details });
  }

  // Handle foreign key violations
  if (error.code === PROJECTS_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return createApiErrorResponse(404, PROJECTS_ERROR_MESSAGES.REFERENCED_RESOURCE_NOT_FOUND);
  }

  // Generic database error (generic errors should come last, after specific checks)
  return createApiErrorResponse(500, fallbackMessage || PROJECTS_ERROR_MESSAGES.DATABASE_ERROR, { original: error });
}
