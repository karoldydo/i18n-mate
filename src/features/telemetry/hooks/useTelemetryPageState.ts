import { useState } from 'react';

import { TELEMETRY_DEFAULT_LIMIT } from '@/shared/constants';

export interface TelemetryPageActions {
  resetPagination: () => void;
  setLimit: (limit: number) => void;
  setPage: (page: number) => void;
  setSortBy: (sortBy: 'created_at') => void;
  toggleSortOrder: () => void;
}

export interface TelemetryPageState {
  limit: number;
  page: number;
  sortBy: 'created_at';
  sortOrder: 'asc' | 'desc';
}

const INITIAL_STATE: TelemetryPageState = {
  limit: TELEMETRY_DEFAULT_LIMIT,
  page: 0,
  sortBy: 'created_at',
  sortOrder: 'desc',
};

/**
 * useTelemetryPageState - Hook for managing telemetry page local UI state
 *
 * Manages pagination and sorting state for the telemetry events table.
 * Provides actions to update state and reset pagination when needed.
 *
 * @returns Object containing current state and action functions
 */
export function useTelemetryPageState(): TelemetryPageActions & TelemetryPageState {
  const [state, setState] = useState<TelemetryPageState>(INITIAL_STATE);

  const setPage = (page: number) => {
    setState((prev) => ({ ...prev, page: Math.max(0, page) }));
  };

  const setLimit = (limit: number) => {
    setState((prev) => ({ ...prev, limit, page: 0 })); // Reset to first page when limit changes
  };

  const setSortBy = (sortBy: 'created_at') => {
    setState((prev) => ({ ...prev, page: 0, sortBy })); // Reset to first page when sorting changes
  };

  const toggleSortOrder = () => {
    setState((prev) => ({
      ...prev,
      page: 0, // Reset to first page when sort order changes
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const resetPagination = () => {
    setState((prev) => ({ ...prev, page: 0 }));
  };

  return {
    ...state,
    resetPagination,
    setLimit,
    setPage,
    setSortBy,
    toggleSortOrder,
  };
}
