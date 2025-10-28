import { type ClassValue, clsx } from 'clsx';
import { differenceInHours, differenceInMinutes, format } from 'date-fns';
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

/**
 * Format date string to localized date format (day month year)
 *
 * @param date - ISO date string to format
 * @returns Formatted date string (e.g., "27 January 2025")
 */
export function formatDate(date: string): string {
  return format(new Date(date), 'd MMMM yyyy');
}

/**
 * Format date string to localized datetime format
 *
 * @param date - ISO date string to format
 * @returns Formatted datetime string (e.g., "27 January 2025, 14:30")
 */
export function formatDateTime(date: string): string {
  return format(new Date(date), 'd MMMM yyyy, HH:mm');
}

/**
 * Format timestamp to human-readable relative or absolute format
 *
 * Shows relative time ("Xm ago" or "Xh ago") for events less than 24 hours old.
 * Shows formatted date for older events.
 *
 * @param timestamp - ISO date string to format
 * @returns Formatted timestamp string (e.g., "5m ago", "2h ago", "Jan 27, 2025, 14:30")
 */
export function formatRelativeTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const hoursAgo = differenceInHours(now, date);

  if (hoursAgo < 24) {
    // show relative time for recent events
    const minutesAgo = differenceInMinutes(now, date);
    if (minutesAgo < 60) {
      return `${minutesAgo}m ago`;
    }
    return `${hoursAgo}h ago`;
  }

  // show date for older events
  return format(date, 'MMM d, yyyy, HH:mm');
}

/**
 * Parse structured error details from database
 *
 * Parses the comma-separated "key:value" format from PostgreSQL error DETAIL field:
 * "error_code:DUPLICATE_LOCALE,field:locale,value:en-US"
 *
 * @param detail - The detail string from PostgreSQL error
 * @returns Record with parsed key-value pairs
 */
export function parseErrorDetail(detail: string): Record<string, string> {
  if (!detail) return {};

  const pairs = detail.split(',');
  return Object.fromEntries(
    pairs.map((pair) => {
      const [key, ...values] = pair.split(':');
      return [key.trim(), values.join(':').trim()]; // Handle values with colons
    })
  );
}
