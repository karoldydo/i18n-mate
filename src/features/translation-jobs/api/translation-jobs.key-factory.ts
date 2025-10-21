import type { GetJobItemsParams, ListTranslationJobsParams } from '@/shared/types';

/**
 * Query key factory for translation jobs
 * Follows TanStack Query best practices for structured query keys
 *
 * Key structure:
 * - ['translation-jobs'] - Base key for all translation job queries
 * - ['translation-jobs', 'active', projectId] - Active job for specific project
 * - ['translation-jobs', 'list', params] - Job list with filters/pagination
 * - ['translation-jobs', 'detail', jobId] - Specific job details
 * - ['translation-jobs', 'items', jobId, params?] - Job items with optional filters
 */
export const TRANSLATION_JOBS_KEY_FACTORY = {
  active: (projectId: string) => [...TRANSLATION_JOBS_KEY_FACTORY.activeJobs(), projectId] as const,
  activeJobs: () => [...TRANSLATION_JOBS_KEY_FACTORY.all, 'active'] as const,
  all: ['translation-jobs'] as const,
  detail: (jobId: string) => [...TRANSLATION_JOBS_KEY_FACTORY.details(), jobId] as const,
  details: () => [...TRANSLATION_JOBS_KEY_FACTORY.all, 'detail'] as const,
  items: (jobId: string, params?: GetJobItemsParams) =>
    [...TRANSLATION_JOBS_KEY_FACTORY.jobItems(), jobId, ...(params ? [params] : [])] as const,
  jobItems: () => [...TRANSLATION_JOBS_KEY_FACTORY.all, 'items'] as const,
  list: (params: ListTranslationJobsParams) => [...TRANSLATION_JOBS_KEY_FACTORY.lists(), params] as const,
  lists: () => [...TRANSLATION_JOBS_KEY_FACTORY.all, 'list'] as const,
};
