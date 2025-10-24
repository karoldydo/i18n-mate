import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { LOCALE_CONSTRAINTS, LOCALE_ERROR_MESSAGES, LOCALE_PG_ERROR_CODES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

/**
 * Handle atomic locale creation errors with specialized error mapping
 *
 * Provides enhanced error handling for the atomic locale creation process including:
 * - Fan-out verification failures
 * - Authentication and authorization errors
 * - Partial fan-out completion issues
 * - All standard database errors from createDatabaseErrorResponse
 *
 * @param error - PostgrestError from Supabase RPC call
 * @param context - Optional context string for logging (e.g., hook name)
 * @param fallbackMessage - Optional custom fallback message for generic errors
 * @returns Standardized ApiErrorResponse object with atomic-specific error codes
 */
export function createAtomicLocaleErrorResponse(
  error: PostgrestError,
  context?: string,
  fallbackMessage?: string
): ApiErrorResponse {
  const LOG_PREFIX = context ? `[${context}]` : '[createAtomicLocaleErrorResponse]';
  console.error(`${LOG_PREFIX} Atomic locale error:`, error);

  // fan-out verification failures
  if (error.message.includes('Fan-out verification failed')) {
    return createApiErrorResponse(500, 'Failed to initialize translations for new locale', {
      code: 'FANOUT_VERIFICATION_FAILED',
      details: error.details,
    });
  }

  // fan-out incomplete errors
  if (error.message.includes('Fan-out incomplete')) {
    const EXPECTED_MATCH = error.message.match(/expected (\d+)/);
    const INSERTED_MATCH = error.message.match(/inserted (\d+)/);

    return createApiErrorResponse(500, 'Incomplete translation initialization', {
      actual: INSERTED_MATCH?.[1] ? parseInt(INSERTED_MATCH[1], 10) : undefined,
      code: 'FANOUT_INCOMPLETE',
      expected: EXPECTED_MATCH?.[1] ? parseInt(EXPECTED_MATCH[1], 10) : undefined,
    });
  }

  // authentication failures
  if (error.message.includes('Authentication required')) {
    return createApiErrorResponse(401, 'Authentication required for locale creation');
  }

  // project access failures
  if (error.message.includes('Project not found or access denied')) {
    return createApiErrorResponse(404, 'Project not found or access denied');
  }

  // fan-out trigger general failures
  if (error.message.includes('Failed to create translations for new locale')) {
    return createApiErrorResponse(500, 'Failed to initialize locale translations', {
      code: 'FANOUT_TRIGGER_FAILED',
      hint: error.hint || 'Locale insertion failed due to translation fan-out error',
    });
  }

  // fall back to generic database error handling
  return createDatabaseErrorResponse(error, context, fallbackMessage);
}

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors including:
 * - Unique constraint violations (23505)
 * - Check constraint violations (23514)
 * - Foreign key violations (23503)
 * - Trigger violations (default locale deletion)
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
  const LOG_PREFIX = context ? `[${context}]` : '[handleDatabaseError]';
  console.error(`${LOG_PREFIX} Database error:`, error);

  // handle unique constraint violations
  if (error.code === LOCALE_PG_ERROR_CODES.UNIQUE_VIOLATION) {
    if (error.message.includes(LOCALE_CONSTRAINTS.UNIQUE_PER_PROJECT)) {
      return createApiErrorResponse(409, LOCALE_ERROR_MESSAGES.ALREADY_EXISTS);
    }
  }

  // handle trigger violations (default locale deletion)
  if (error.message.includes('Cannot delete default_locale')) {
    return createApiErrorResponse(400, 'Cannot delete default locale');
  }

  // handle check constraint violations
  if (error.code === LOCALE_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.INVALID_FORMAT, { constraint: error.details });
  }

  // handle foreign key violations
  if (error.code === LOCALE_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return createApiErrorResponse(404, 'Project not found');
  }

  // generic database error
  return createApiErrorResponse(500, fallbackMessage || 'Database operation failed', { original: error });
}
