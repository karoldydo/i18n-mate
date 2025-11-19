import { useEffect, useState } from 'react';

/**
 * Custom hook for debouncing a value
 *
 * Delays updating the debounced value until after the specified delay
 * has elapsed since the last time the value changed. Useful for:
 * - Search inputs to reduce API calls
 * - Window resize handlers
 * - Any expensive operation triggered by frequent updates
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 *
 * useEffect(() => {
 *   // API call with debounced value
 *   fetchResults(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 * ```
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // set timeout to update debounced value after delay
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // cleanup function clears timeout if value changes before delay elapses
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}
