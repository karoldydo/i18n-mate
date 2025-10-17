import { QueryClient } from '@tanstack/react-query';
import { ZodError } from 'zod';

import type { ApiErrorResponse } from '@/shared/types';

import { createApiErrorResponse } from '@/shared/utils';

/**
 * Handle Zod validation errors and convert them to API errors
 *
 * Converts ZodError to standardized ApiError format with detailed field information.
 * Used by global QueryClient error handler to ensure consistent validation error format.
 *
 * @param error - ZodError from schema validation
 * @param context - Optional context string for logging (e.g., hook name)
 * @returns Standardized ApiError object with validation details
 */
function handleValidationError(error: ZodError, context?: string): ApiErrorResponse {
  const logPrefix = context ? `[${context}]` : '[handleValidationError]';
  console.error(`${logPrefix} Validation error:`, error);

  const firstError = error.errors[0];

  return createApiErrorResponse(400, firstError.message, {
    constraint: firstError.code,
    field: firstError.path.join('.'),
  });
}

/**
 * Check if an error is a Zod validation error
 *
 * @param error - Error to check
 * @returns True if error is a ZodError
 */
function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

/**
 * Global QueryClient configuration with automatic Zod error handling
 *
 * This configuration intercepts all query and mutation errors and converts
 * ZodError instances to standardized ApiError format, ensuring consistent
 * error handling across the application.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error) => {
        // Transform Zod validation errors to ApiError format
        if (isZodError(error)) {
          const apiError = handleValidationError(error);
          // Re-throw as ApiError to maintain error chain
          throw apiError;
        }
      },
    },
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on validation errors
        if (isZodError(error)) {
          return false;
        }
        // Default retry logic for other errors (max 3 attempts)
        return failureCount < 3;
      },
    },
  },
});

export { queryClient };
