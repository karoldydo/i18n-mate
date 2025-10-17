import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, KeyDefaultViewListResponse, ListKeysDefaultViewParams } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../keys.errors';
import { keysKeys } from '../keys.keys';
import { keyDefaultViewResponseSchema, listKeysDefaultViewSchema } from '../keys.schemas';

/**
 * Fetch a paginated list of keys in default language view with missing counts
 *
 * Uses the RPC function `list_keys_default_view` with exact total counting
 * enabled. Returns data items validated at runtime and pagination metadata
 * computed from input params and result size.
 *
 * @param params - Query parameters including project_id, search, missing_only, pagination
 * @returns TanStack Query result with data and metadata
 */
export function useKeysDefaultView(params: ListKeysDefaultViewParams) {
  const supabase = useSupabase();

  return useQuery<KeyDefaultViewListResponse, ApiErrorResponse>({
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      // Validate parameters
      const validated = listKeysDefaultViewSchema.parse(params);

      // Call RPC function for default view list
      const { count, data, error } = await supabase.rpc(
        'list_keys_default_view',
        {
          p_limit: validated.limit,
          p_missing_only: validated.missing_only,
          p_offset: validated.offset,
          p_project_id: validated.project_id,
          p_search: validated.search,
        },
        { count: 'exact' }
      );

      if (error) {
        throw createDatabaseErrorResponse(error, 'useKeysDefaultView', 'Failed to fetch keys');
      }

      // Runtime validation of response data
      const keys = z.array(keyDefaultViewResponseSchema).parse(data || []);

      return {
        data: keys,
        metadata: {
          end: (validated.offset || 0) + keys.length - 1,
          start: validated.offset || 0,
          total: count || 0,
        },
      };
    },
    queryKey: keysKeys.defaultView(params.project_id, {
      limit: params.limit,
      missing_only: params.missing_only,
      offset: params.offset,
      search: params.search,
    }),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
