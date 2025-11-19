import { type ClassValue, clsx } from 'clsx';
import { differenceInHours, differenceInMinutes, format } from 'date-fns';
import { twMerge } from 'tailwind-merge';

import type { ApiErrorResponse } from '../types';

/**
 * Calculate pagination metadata for API responses
 *
 * Handles edge cases like empty results and ensures consistent metadata calculation.
 *
 * @param {number} offset - The starting offset for the current page
 * @param {number} itemCount - Number of items in the current result set
 * @param {number} totalCount - Total number of items available
 *
 * @returns {{ start: number; end: number; total: number }} Pagination metadata with start, end, and total
 */
export function calculatePaginationMetadata(offset: number, itemCount: number, totalCount: number) {
  return {
    end: itemCount > 0 ? offset + itemCount - 1 : offset - 1,
    start: offset,
    total: totalCount,
  };
}

/**
 * Merge class names with Tailwind CSS conflict resolution
 *
 * Combines multiple class name inputs (strings, objects, arrays) into a single string.
 * Uses clsx for conditional class handling and tailwind-merge to resolve Tailwind CSS
 * class conflicts by keeping the last conflicting class.
 *
 * @param {...ClassValue[]} inputs - Variable number of class name inputs (strings, objects, arrays, or conditional expressions)
 *
 * @returns {string} Merged class name string with resolved Tailwind conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Error factory for creating standardized API errors
 *
 * @param {number} code - HTTP status code
 * @param {string} message - Human-readable error message
 * @param {Record<string, unknown>} [details] - Optional additional error details
 *
 * @returns {ApiErrorResponse} Standardized ApiErrorResponse object
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
 * @param {string} date - ISO date string to format
 *
 * @returns {string} Formatted date string (e.g., "27 January 2025")
 */
export function formatDate(date: string): string {
  return format(new Date(date), 'd MMMM yyyy');
}

/**
 * Format date string to localized datetime format
 *
 * @param {string} date - ISO date string to format
 *
 * @returns {string} Formatted datetime string (e.g., "27 January 2025, 14:30")
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
 * @param {string} timestamp - ISO date string to format
 *
 * @returns {string} Formatted timestamp string (e.g., "5m ago", "2h ago", "Jan 27, 2025, 14:30")
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
 * @param {string} detail - The detail string from PostgreSQL error
 *
 * @returns {Record<string, string>} Record with parsed key-value pairs
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
