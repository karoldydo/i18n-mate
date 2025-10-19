/**
 * Translation Jobs API
 *
 * This module provides TanStack Query hooks for managing LLM translation jobs.
 * All hooks use the shared Supabase client from context and follow React Query best practices.
 *
 * @module features/translation-jobs/api
 */

// Error Utilities
export { createEdgeFunctionErrorResponse, createTranslationJobDatabaseErrorResponse } from './translation-jobs.errors';

// Query Keys
export { translationJobsKeys } from './translation-jobs.keys';

// Validation Schemas
export * from './translation-jobs.schemas';

// Hooks
export { useActiveTranslationJob } from './useActiveTranslationJob/useActiveTranslationJob';
export { useCancelTranslationJob } from './useCancelTranslationJob/useCancelTranslationJob';
export { useCreateTranslationJob } from './useCreateTranslationJob/useCreateTranslationJob';
export { useTranslationJobItems } from './useTranslationJobItems/useTranslationJobItems';
export { useTranslationJobs } from './useTranslationJobs/useTranslationJobs';
