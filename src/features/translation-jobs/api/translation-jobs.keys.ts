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
export const translationJobsKeys = {
  active: (projectId: string) => [...translationJobsKeys.activeJobs(), projectId] as const,
  activeJobs: () => [...translationJobsKeys.all, 'active'] as const,
  all: ['translation-jobs'] as const,
  detail: (jobId: string) => [...translationJobsKeys.details(), jobId] as const,
  details: () => [...translationJobsKeys.all, 'detail'] as const,
  items: (jobId: string, params?: GetJobItemsParams) =>
    [...translationJobsKeys.jobItems(), jobId, ...(params ? [params] : [])] as const,
  jobItems: () => [...translationJobsKeys.all, 'items'] as const,
  list: (params: ListTranslationJobsParams) => [...translationJobsKeys.lists(), params] as const,
  lists: () => [...translationJobsKeys.all, 'list'] as const,
};
