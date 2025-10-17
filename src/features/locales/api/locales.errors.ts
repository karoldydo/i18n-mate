import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { createApiErrorResponse } from '@/shared/utils';

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
