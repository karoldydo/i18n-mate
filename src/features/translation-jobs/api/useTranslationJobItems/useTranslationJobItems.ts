import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, GetJobItemsParams, ListTranslationJobItemsResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createTranslationJobDatabaseErrorResponse } from '../translation-jobs.errors';
import { translationJobsKeys } from '../translation-jobs.keys';
import { getJobItemsSchema, translationJobItemResponseSchema } from '../translation-jobs.schemas';

/**
 * Fetch detailed item-level status for translation job
 *
 * Includes key information via JOIN for displaying full_key names.
 * Used for debugging failed translations and showing detailed progress.
 *
 * Features:
 * - Item-level status tracking (pending, completed, failed, skipped)
 * - Key name resolution via LEFT JOIN to keys table
 * - Error code and message display for failed items
 * - Pagination with total count
 * - Optional status filtering
 * - Ordered by creation time for predictable display
 *
 * This hook is essential for:
 * - Debugging translation failures
 * - Showing detailed job progress
 * - Displaying error messages per key
 * - Monitoring job execution status
 *
 * @param params - Query parameters for job items
 * @param params.jobId - Translation job UUID to fetch items from (required)
 * @param params.status - Filter by item status (pending, completed, failed, skipped)
 * @param params.limit - Items per page (1-1000, default: 100)
 * @param params.offset - Pagination offset (min: 0, default: 0)
 * @throws {ApiErrorResponse} 400 - Validation error (invalid job_id, limit > 1000, negative offset)
 * @throws {ApiErrorResponse} 403 - Job not accessible (project not owned via RLS)
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 * @returns TanStack Query result with job items data and pagination metadata
 */
export function useTranslationJobItems(params: GetJobItemsParams) {
  const supabase = useSupabase();

  return useQuery<ListTranslationJobItemsResponse, ApiErrorResponse>({
    gcTime: 30 * 60 * 1000, // 30 minutes
    queryFn: async () => {
      // Validate parameters
      const validated = getJobItemsSchema.parse({
        job_id: params.jobId,
        limit: params.limit,
        offset: params.offset,
        status: params.status,
      });

      let query = supabase
        .from('translation_job_items')
        .select('*, keys(full_key)', { count: 'exact' })
        .eq('job_id', validated.job_id)
        .range(validated.offset, validated.offset + validated.limit - 1);

      // Apply status filter if provided
      if (validated.status) {
        query = query.eq('status', validated.status);
      }

      // Order by creation time
      query = query.order('created_at', { ascending: true });

      const { count, data, error } = await query;

      if (error) {
        throw createTranslationJobDatabaseErrorResponse(error, 'useTranslationJobItems', 'Failed to fetch job items');
      }

      // Runtime validation of response data
      const items = z.array(translationJobItemResponseSchema).parse(data || []);

      return {
        data: items,
        metadata: {
          end: validated.offset + items.length - 1,
          start: validated.offset,
          total: count || 0,
        },
      };
    },
    queryKey: translationJobsKeys.items(params.jobId, params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
