import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { TRANSLATION_JOBS_CONSTRAINTS, TRANSLATION_JOBS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

/**
 * Handle Edge Function errors
 *
 * Converts Edge Function HTTP errors to standardized API error responses.
 * Maps common status codes to appropriate user-facing messages.
 *
 * @param message - Error message from Edge Function
 * @param statusCode - HTTP status code from Edge Function
 * @param context - Optional context string for logging
 * @returns Standardized ApiErrorResponse object
 */
export function createEdgeFunctionErrorResponse(
  message: string,
  statusCode: number,
  context?: string
): ApiErrorResponse {
  const LOG_PREFIX = context ? `[${context}]` : '[handleEdgeFunctionError]';
  console.error(`${LOG_PREFIX} Edge Function error:`, { message, statusCode });

  // map common edge function errors
  if (statusCode === 429) {
    return createApiErrorResponse(429, TRANSLATION_JOBS_ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
  }
  if (statusCode === 409) {
    return createApiErrorResponse(409, TRANSLATION_JOBS_ERROR_MESSAGES.ACTIVE_JOB_EXISTS);
  }
  if (statusCode >= 500) {
    return createApiErrorResponse(500, TRANSLATION_JOBS_ERROR_MESSAGES.EDGE_FUNCTION_ERROR);
  }

  return createApiErrorResponse(statusCode, message);
}

/**
 * Handle database errors and convert them to API errors for translation jobs
 *
 * Provides consistent error handling for PostgreSQL errors including:
 * - Trigger violations (active job prevention, source locale validation)
 * - Check constraint violations (status transitions, field validation)
 * - Foreign key violations (project ownership, key existence)
 * - Unique constraint violations (job uniqueness)
 *
 * @param error - PostgrestError from Supabase
 * @param context - Optional context string for logging (e.g., hook name)
 * @param fallbackMessage - Optional custom fallback message for generic errors
 * @returns Standardized ApiErrorResponse object
 */
export function createTranslationJobDatabaseErrorResponse(
  error: PostgrestError,
  context?: string,
  fallbackMessage?: string
): ApiErrorResponse {
  const LOG_PREFIX = context ? `[${context}]` : '[handleTranslationJobDatabaseError]';
  console.error(`${LOG_PREFIX} Database error:`, error);

  // handle trigger violations (business logic) - check for specific constraint names
  if (
    error.message?.includes(TRANSLATION_JOBS_CONSTRAINTS.ACTIVE_JOB_UNIQUE) ||
    error.message?.includes('Only one active translation job allowed per project')
  ) {
    return createApiErrorResponse(409, TRANSLATION_JOBS_ERROR_MESSAGES.ACTIVE_JOB_EXISTS);
  }

  if (
    error.message?.includes(TRANSLATION_JOBS_CONSTRAINTS.SOURCE_LOCALE_DEFAULT) ||
    error.message?.includes('source_locale must equal project default_locale') ||
    error.message?.includes('Source locale cannot be used as target locale')
  ) {
    return createApiErrorResponse(400, TRANSLATION_JOBS_ERROR_MESSAGES.TARGET_LOCALE_IS_DEFAULT);
  }

  // handle common postgresql errors by code
  switch (error.code) {
    case '42P01': // undefined_table
      return createApiErrorResponse(500, TRANSLATION_JOBS_ERROR_MESSAGES.DATABASE_SCHEMA_ERROR);
    case '23503': // foreign_key_violation
      return createApiErrorResponse(404, TRANSLATION_JOBS_ERROR_MESSAGES.FOREIGN_KEY_VIOLATION);
    case '23505': // unique_violation
      return createApiErrorResponse(409, TRANSLATION_JOBS_ERROR_MESSAGES.RESOURCE_ALREADY_EXISTS);
    case '23514': // check_violation
      return createApiErrorResponse(400, TRANSLATION_JOBS_ERROR_MESSAGES.CHECK_VIOLATION);
    case '42501': // insufficient_privilege
      return createApiErrorResponse(403, TRANSLATION_JOBS_ERROR_MESSAGES.INSUFFICIENT_PRIVILEGE);
    default:
      break;
  }

  // generic database error
  return createApiErrorResponse(500, fallbackMessage || TRANSLATION_JOBS_ERROR_MESSAGES.DATABASE_ERROR, {
    original: error,
  });
}
