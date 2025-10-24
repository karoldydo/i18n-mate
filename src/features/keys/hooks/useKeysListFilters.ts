import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { KEYS_DEFAULT_LIMIT } from '@/shared/constants';

/**
 * useKeysListFilters - Manages filter state with URL synchronization
 *
 * Provides state management for search, filtering, and pagination parameters
 * while synchronizing with URL search params for bookmarkable searches.
 *
 * @returns Filter state and setter functions
 */
export function useKeysListFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // extract current values from URL
  const searchValue = searchParams.get('search') || '';
  const missingOnly = searchParams.get('missingOnly') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || String(KEYS_DEFAULT_LIMIT), 10);

  // setter for search value with debouncing handled by component
  const setSearchValue = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set('search', value);
        } else {
          next.delete('search');
        }
        // reset to page 1 when search changes
        next.set('page', '1');
        return next;
      });
    },
    [setSearchParams]
  );

  // setter for missing filter toggle
  const setMissingOnly = useCallback(
    (enabled: boolean) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (enabled) {
          next.set('missingOnly', 'true');
        } else {
          next.delete('missingOnly');
        }
        // reset to page 1 when filter changes
        next.set('page', '1');
        return next;
      });
    },
    [setSearchParams]
  );

  // setter for page number
  const setPage = useCallback(
    (newPage: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', String(newPage));
        return next;
      });
    },
    [setSearchParams]
  );

  // setter for page size
  const setPageSize = useCallback(
    (size: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('pageSize', String(size));
        // reset to page 1 when page size changes
        next.set('page', '1');
        return next;
      });
    },
    [setSearchParams]
  );

  return useMemo(
    () => ({
      missingOnly,
      page,
      pageSize,
      searchValue,
      setMissingOnly,
      setPage,
      setPageSize,
      setSearchValue,
    }),
    [searchValue, missingOnly, page, pageSize, setSearchValue, setMissingOnly, setPage, setPageSize]
  );
}
