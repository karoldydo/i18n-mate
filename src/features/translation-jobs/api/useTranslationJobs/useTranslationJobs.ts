import { useQuery } from '@tanstack/react-query';

import type { ApiErrorResponse, ListTranslationJobsParams, ListTranslationJobsResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createTranslationJobDatabaseErrorResponse } from '../translation-jobs.errors';
import { translationJobsKeys } from '../translation-jobs.keys';
import { listTranslationJobsSchema } from '../translation-jobs.schemas';

/**
 * Fetch paginated list of translation jobs for project
 *
 * Provides comprehensive job history with filtering and sorting capabilities.
 * Supports pagination with total count for UI pagination controls.
 * Jobs are sorted by creation date (newest first) by default.
 *
 * Features:
 * - Pagination with limit/offset
 * - Status filtering (single status or array of statuses)
 * - Sorting by created_at or status (asc/desc)
 * - Total count for pagination metadata
 * - Runtime validation of response data
 *
 * @param params - Query parameters for job listing
 * @param params.project_id - Project UUID to fetch jobs from (required)
 * @param params.limit - Items per page (1-100, default: 20)
 * @param params.offset - Pagination offset (min: 0, default: 0)
 * @param params.status - Filter by job status (single or array)
 * @param params.order - Sort order (default: 'created_at.desc')
 * @throws {ApiErrorResponse} 400 - Validation error (invalid project_id, limit > 100, negative offset)
 * @throws {ApiErrorResponse} 403 - Project not owned by user (via RLS)
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 * @returns TanStack Query result with jobs data and pagination metadata
 */
export function useTranslationJobs(params: ListTranslationJobsParams) {
  const supabase = useSupabase();

  return useQuery<ListTranslationJobsResponse, ApiErrorResponse>({
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      // Validate parameters
      const validated = listTranslationJobsSchema.parse(params);

      let query = supabase
        .from('translation_jobs')
        .select('*', { count: 'exact' })
        .eq('project_id', validated.project_id)
        .range(validated.offset, validated.offset + validated.limit - 1);

      // Apply status filter if provided
      if (validated.status) {
        if (Array.isArray(validated.status)) {
          query = query.in('status', validated.status);
        } else {
          query = query.eq('status', validated.status);
        }
      }

      // Apply sorting
      const [field, direction] = validated.order.split('.');
      query = query.order(field, { ascending: direction === 'asc' });

      const { count, data, error } = await query;

      if (error) {
        throw createTranslationJobDatabaseErrorResponse(
          error,
          'useTranslationJobs',
          'Failed to fetch translation jobs'
        );
      }

      // Return jobs directly - they're already the correct Supabase type
      const jobs = data || [];

      return {
        data: jobs,
        metadata: {
          end: validated.offset + jobs.length - 1,
          start: validated.offset,
          total: count || 0,
        },
      };
    },
    queryKey: translationJobsKeys.list(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}
