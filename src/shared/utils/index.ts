import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { ApiErrorResponse } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Error factory for creating standardized API errors
 *
 * @param code - HTTP status code
 * @param message - Human-readable error message
 * @param details - Optional additional error details
 * @returns Standardized ApiErrorResponse object
 */
export function createApiErrorResponse(
  code: number,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    data: null,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}
