import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, TranslationJobResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createTranslationJobDatabaseErrorResponse } from '../translation-jobs.errors';
import { TRANSLATION_JOBS_KEY_FACTORY } from '../translation-jobs.key-factory';
import { CHECK_ACTIVE_JOB_SCHEMA, TRANSLATION_JOB_RESPONSE_SCHEMA } from '../translation-jobs.schemas';

/**
 * Check for active translation job in project
 *
 * Fast lookup optimized for polling during translation progress.
 * Uses composite index on (project_id, status) for O(log n) performance.
 * Returns array that may be empty if no active job exists.
 *
 * This hook is designed for:
 * - Real-time polling during job execution
 * - UI state management (showing active job progress)
 * - Preventing multiple concurrent jobs
 *
 * @param projectId - Project UUID to check for active jobs
 *
 * @throws {ApiErrorResponse} 400 - Invalid project ID format
 * @throws {ApiErrorResponse} 403 - Project not owned by user (via RLS)
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns TanStack Query result with active job array (empty if none active)
 */
export function useActiveTranslationJob(projectId: string) {
  const supabase = useSupabase();

  return useQuery<TranslationJobResponse[], ApiErrorResponse>({
    gcTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      // validate project id
      const validated = CHECK_ACTIVE_JOB_SCHEMA.parse({ project_id: projectId });

      const { data, error } = await supabase
        .from('translation_jobs')
        .select('*')
        .eq('project_id', validated.project_id)
        .in('status', ['pending', 'running'])
        .limit(1);

      if (error) {
        throw createTranslationJobDatabaseErrorResponse(error, 'useActiveTranslationJob', 'Failed to check active job');
      }

      // runtime validation of response data
      return z.array(TRANSLATION_JOB_RESPONSE_SCHEMA).parse(data || []);
    },
    queryKey: TRANSLATION_JOBS_KEY_FACTORY.active(projectId),
    staleTime: 2 * 1000, // 2 seconds for real-time polling
  });
}
