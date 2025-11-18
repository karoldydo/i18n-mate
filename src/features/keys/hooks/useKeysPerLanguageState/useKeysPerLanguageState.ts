import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { KEYS_DEFAULT_LIMIT } from '@/shared/constants';

/**
 * Manages state for per-language keys view
 *
 * Provides comprehensive state management for the per-language view including:
 * - Search and filter state with URL synchronization
 * - Inline editing state (single-key editing mode)
 * - Pagination state with URL synchronization
 * - Editing metadata (saving state, errors)
 *
 * @returns {Object} State accessors and setter functions
 * @returns {string} returns.searchValue - Current search query value
 * @returns {boolean} returns.missingOnly - Whether missing-only filter is enabled
 * @returns {number} returns.page - Current page number (1-based)
 * @returns {number} returns.pageSize - Number of items per page
 * @returns {string | null} returns.editingKeyId - ID of the key currently being edited (null if none)
 * @returns {boolean} returns.isSaving - Whether a save operation is in progress
 * @returns {string | null} returns.editError - Error message from the last edit operation (null if none)
 * @returns {(value: string) => void} returns.setSearchValue - Setter for search value (resets to page 1)
 * @returns {(enabled: boolean) => void} returns.setMissingOnly - Setter for missing filter (resets to page 1)
 * @returns {(newPage: number) => void} returns.setPage - Setter for page number
 * @returns {(keyId: string) => void} returns.startEditing - Start editing a key by ID
 * @returns {() => void} returns.cancelEditing - Cancel current editing operation
 * @returns {(saving: boolean) => void} returns.setSavingState - Set saving state
 * @returns {(error: string | null) => void} returns.setError - Set edit error message
 */
export function useKeysPerLanguageState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // editing state (local state, not in URL)
  const [editingKeyId, setEditingKeyId] = useState<null | string>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<null | string>(null);

  // extract filter values from URL
  const searchValue = searchParams.get('search') || '';
  const missingOnly = searchParams.get('missingOnly') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || String(KEYS_DEFAULT_LIMIT), 10);

  // setter for search value
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

  // start editing a key
  const startEditing = useCallback((keyId: string) => {
    setEditingKeyId(keyId);
    setEditError(null);
    setIsSaving(false);
  }, []);

  // cancel editing
  const cancelEditing = useCallback(() => {
    setEditingKeyId(null);
    setEditError(null);
    setIsSaving(false);
  }, []);

  // set saving state
  const setSavingState = useCallback((saving: boolean) => {
    setIsSaving(saving);
  }, []);

  // set edit error
  const setError = useCallback((error: null | string) => {
    setEditError(error);
  }, []);

  return useMemo(
    () => ({
      cancelEditing,
      editError,
      editingKeyId,
      isSaving,
      missingOnly,
      page,
      pageSize,
      searchValue,
      setError,
      setMissingOnly,
      setPage,
      setSavingState,
      setSearchValue,
      startEditing,
    }),
    [
      searchValue,
      missingOnly,
      page,
      pageSize,
      editingKeyId,
      isSaving,
      editError,
      setSearchValue,
      setMissingOnly,
      setPage,
      startEditing,
      cancelEditing,
      setSavingState,
      setError,
    ]
  );
}
