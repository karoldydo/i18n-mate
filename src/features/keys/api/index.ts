/**
 * Keys API
 *
 * This module provides TanStack Query hooks for managing translation keys.
 * All hooks use the shared Supabase client from context and follow React Query best practices.
 *
 * @module features/keys/api
 */

// Error Utilities
export { createDatabaseErrorResponse } from './keys.errors';

// Query Keys
export { keysKeys } from './keys.keys';

// Validation Schemas
export * from './keys.schemas';

// Mutation Hooks
export { useCreateKey } from './useCreateKey/useCreateKey';
export { useDeleteKey } from './useDeleteKey/useDeleteKey';

// Query Hooks
export { useKeysDefaultView } from './useKeysDefaultView/useKeysDefaultView';
export { useKeysPerLanguageView } from './useKeysPerLanguageView/useKeysPerLanguageView';
