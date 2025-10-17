import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

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
  const logPrefix = context ? `[${context}]` : '[createAtomicLocaleErrorResponse]';
  console.error(`${logPrefix} Atomic locale error:`, error);

  // Fan-out verification failures
  if (error.message.includes('Fan-out verification failed')) {
    return createApiErrorResponse(500, 'Failed to initialize translations for new locale', {
      code: 'FANOUT_VERIFICATION_FAILED',
      details: error.details,
    });
  }

  // Fan-out incomplete errors
  if (error.message.includes('Fan-out incomplete')) {
    const expectedMatch = error.message.match(/expected (\d+)/);
    const insertedMatch = error.message.match(/inserted (\d+)/);

    return createApiErrorResponse(500, 'Incomplete translation initialization', {
      actual: insertedMatch?.[1] ? parseInt(insertedMatch[1], 10) : undefined,
      code: 'FANOUT_INCOMPLETE',
      expected: expectedMatch?.[1] ? parseInt(expectedMatch[1], 10) : undefined,
    });
  }

  // Authentication failures
  if (error.message.includes('Authentication required')) {
    return createApiErrorResponse(401, 'Authentication required for locale creation');
  }

  // Project access failures
  if (error.message.includes('Project not found or access denied')) {
    return createApiErrorResponse(404, 'Project not found or access denied');
  }

  // Fan-out trigger general failures
  if (error.message.includes('Failed to create translations for new locale')) {
    return createApiErrorResponse(500, 'Failed to initialize locale translations', {
      code: 'FANOUT_TRIGGER_FAILED',
      hint: error.hint || 'Locale insertion failed due to translation fan-out error',
    });
  }

  // Fall back to generic database error handling
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
  const logPrefix = context ? `[${context}]` : '[handleDatabaseError]';
  console.error(`${logPrefix} Database error:`, error);

  // Handle unique constraint violations
  if (error.code === '23505') {
    if (error.message.includes('project_locales_unique_per_project')) {
      return createApiErrorResponse(409, 'Locale already exists for this project');
    }
  }

  // Handle trigger violations (default locale deletion)
  if (error.message.includes('Cannot delete default_locale')) {
    return createApiErrorResponse(400, 'Cannot delete default locale');
  }

  // Handle check constraint violations
  if (error.code === '23514') {
    return createApiErrorResponse(400, 'Invalid field value', { constraint: error.details });
  }

  // Handle foreign key violations
  if (error.code === '23503') {
    return createApiErrorResponse(404, 'Project not found');
  }

  // Generic database error
  return createApiErrorResponse(500, fallbackMessage || 'Database operation failed', { original: error });
}
