/**
 * Translations API
 *
 * This module provides TanStack Query hooks for managing translation values.
 * All hooks use the shared Supabase client from context and follow React Query best practices.
 *
 * @module features/translations/api
 */

// Error Utilities
export { createDatabaseErrorResponse } from './translations.errors';

// Query Keys
export { translationsKeys } from './translations.keys';

// Validation Schemas
export * from './translations.schemas';

// Mutation Hooks
export { useBulkUpdateTranslations } from './useBulkUpdateTranslations/useBulkUpdateTranslations';

// Query Hooks
export { useTranslation } from './useTranslation/useTranslation';
export { useUpdateTranslation } from './useUpdateTranslation/useUpdateTranslation';
