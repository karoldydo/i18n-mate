import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { TELEMETRY_ERROR_MESSAGES, TELEMETRY_PG_ERROR_CODES } from '@/shared/constants';
import { createApiErrorResponse, parseErrorDetail } from '@/shared/utils';

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors including:
 * - Check constraint violations (23514)
 * - Foreign key violations (23503)
 * - Partition errors
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

  // parse structured error details if available
  let parsedError: Record<string, string> = {};
  if (error.details) {
    parsedError = parseErrorDetail(error.details);
  }

  // handle check constraint violations (invalid enum value)
  if (error.code === TELEMETRY_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, TELEMETRY_ERROR_MESSAGES.INVALID_EVENT_NAME, {
      constraint: error.details,
      parsedDetails: parsedError,
    });
  }

  // handle foreign key violations (project not found)
  if (error.code === TELEMETRY_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return createApiErrorResponse(404, TELEMETRY_ERROR_MESSAGES.PROJECT_NOT_FOUND, {
      parsedDetails: parsedError,
    });
  }

  // handle partition errors
  if (error.message.includes('partition') || error.message.includes('no partition')) {
    return createApiErrorResponse(500, TELEMETRY_ERROR_MESSAGES.PARTITION_ERROR, {
      original: error,
      parsedDetails: parsedError,
    });
  }

  // build the details object conditionally
  const detailsObject: Record<string, unknown> = { original: error };
  if (Object.keys(parsedError).length > 0) {
    detailsObject.parsedDetails = parsedError;
  }

  // generic database error
  return createApiErrorResponse(500, fallbackMessage || TELEMETRY_ERROR_MESSAGES.DATABASE_ERROR, detailsObject);
}
