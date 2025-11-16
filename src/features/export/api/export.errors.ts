import type { ApiErrorResponse } from '@/shared/types';

import { createApiErrorResponse } from '@/shared/utils';

/**
 * Handle Edge Function errors and convert them to API errors.
 *
 * Provides consistent error handling for Edge Function responses including:
 * - Authentication errors (401)
 * - Not found errors (404)
 * - Server errors (500)
 *
 * @param {string} message - Error message from Edge Function
 * @param {number} statusCode - HTTP status code from response
 * @param {string} [context] - Optional context string for logging (e.g., hook name)
 *
 * @returns {ApiErrorResponse} Standardized ApiErrorResponse object
 *
 * @see {@link createApiErrorResponse} for the underlying error response factory
 */
export function createEdgeFunctionErrorResponse(
  message: string,
  statusCode: number,
  context?: string
): ApiErrorResponse {
  const logPrefix = context ? `[${context}]` : '[handleEdgeFunctionError]';
  console.error(`${logPrefix} Edge Function error:`, { message, statusCode });

  return createApiErrorResponse(statusCode, message);
}
