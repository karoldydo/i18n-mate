import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { TELEMETRY_ERROR_MESSAGES, TELEMETRY_PG_ERROR_CODES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

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

  // handle check constraint violations (invalid enum value)
  if (error.code === TELEMETRY_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, TELEMETRY_ERROR_MESSAGES.INVALID_EVENT_NAME, { constraint: error.details });
  }

  // handle foreign key violations (project not found)
  if (error.code === TELEMETRY_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return createApiErrorResponse(404, TELEMETRY_ERROR_MESSAGES.PROJECT_NOT_FOUND);
  }

  // handle partition errors
  if (error.message.includes('partition') || error.message.includes('no partition')) {
    return createApiErrorResponse(500, TELEMETRY_ERROR_MESSAGES.PARTITION_ERROR, { original: error });
  }

  // generic database error
  return createApiErrorResponse(500, fallbackMessage || TELEMETRY_ERROR_MESSAGES.DATABASE_ERROR, { original: error });
}
