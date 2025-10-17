/**
 * Project Locales API
 *
 * This module provides TanStack Query hooks for managing languages assigned to projects.
 * All hooks use the shared Supabase client from context and follow React Query best practices.
 *
 * @module features/locales/api
 */

// Error Utilities
export { createAtomicLocaleErrorResponse, createDatabaseErrorResponse } from './locales.errors';

// Query Keys
export { localesKeys } from './locales.keys';

// Validation Schemas
export * from './locales.schemas';

// Utility Functions
export { isValidLocaleFormatClient, normalizeLocaleCode } from './locales.utils';

// Mutation Hooks
export { useCreateProjectLocale } from './useCreateProjectLocale/useCreateProjectLocale';
export { useDeleteProjectLocale } from './useDeleteProjectLocale/useDeleteProjectLocale';
// Query Hooks
export { useProjectLocales } from './useProjectLocales/useProjectLocales';

export { useUpdateProjectLocale } from './useUpdateProjectLocale/useUpdateProjectLocale';
