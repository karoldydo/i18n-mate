import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { ApiErrorResponse } from '../types';

/**
 * Calculate pagination metadata for API responses
 *
 * Handles edge cases like empty results and ensures consistent metadata calculation.
 *
 * @param offset - The starting offset for the current page
 * @param itemCount - Number of items in the current result set
 * @param totalCount - Total number of items available
 * @returns Pagination metadata with start, end, and total
 */
export function calculatePaginationMetadata(offset: number, itemCount: number, totalCount: number) {
  return {
    end: itemCount > 0 ? offset + itemCount - 1 : offset - 1,
    start: offset,
    total: totalCount,
  };
}

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
