import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, TranslationJobResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createTranslationJobDatabaseErrorResponse } from '../translation-jobs.errors';
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
    queryFn: async () => {
      const { project_id } = CHECK_ACTIVE_JOB_SCHEMA.parse({ project_id: projectId });

      const { data, error } = await supabase
        .from('translation_jobs')
        .select('*')
        .eq('project_id', project_id)
        .in('status', ['pending', 'running'])
        .limit(1);

      if (error) {
        throw createTranslationJobDatabaseErrorResponse(error, 'useActiveTranslationJob', 'Failed to check active job');
      }

      return z.array(TRANSLATION_JOB_RESPONSE_SCHEMA).parse(data || []);
    },
    queryKey: ['translation-jobs', 'active', projectId],
  });
}
