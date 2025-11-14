import { useQuery } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

/**
 * Fetches the project name for a given projectId using TanStack Query.
 *
 * - Uses `useQuery` (not suspense) to allow UI (e.g. breadcrumbs) to render
 *   immediately without waiting for project name data, returning undefined
 *   until the name is resolved.
 * - Optimized by directly querying the `projects` table for the `name` field
 *   via Supabase, avoiding full object fetch or expensive RPC.
 * - Returns undefined if the projectId is not provided, invalid, or data is not available.
 * - Honors Supabase RLS; if the user has no access, no error is thrown (empty result).
 * - Database errors are captured and thrown as `ApiErrorResponse`.
 * - Uses infinite `staleTime` and `gcTime` to always serve cached project names
 *   (since names are stable and minimize refetch/UI flicker).
 *
 * @param projectId - The UUID string of the project to fetch the name for.
 * @returns The project name as a string if found, otherwise undefined.
 *
 * @throws {ApiErrorResponse} 500 - On database errors (except RLS no-access).
 */
export function useProjectName(projectId: null | string | undefined): string | undefined {
  const supabase = useSupabase();

  const { data } = useQuery<null | { name: string }, ApiErrorResponse>({
    enabled: !!projectId,
    gcTime: Infinity,
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase.from('projects').select('name').eq('id', projectId).maybeSingle();

      if (error) {
        throw createApiErrorResponse(500, `Failed to fetch project name: ${error.message}`);
      }

      return data;
    },
    queryKey: ['projects', 'detail', projectId, 'name'],
    staleTime: Infinity,
  });

  return data?.name;
}
