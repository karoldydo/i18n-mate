import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, KeyPerLanguageViewListResponse, ListKeysPerLanguageParams } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../keys.errors';
import { keysKeys } from '../keys.keys';
import { keyPerLanguageViewResponseSchema, listKeysPerLanguageViewSchema } from '../keys.schemas';

/**
 * Fetch a paginated list of keys for a specific language with translation metadata
 *
 * Uses the RPC function `list_keys_per_language_view` with exact total counting
 * enabled. Returns data items validated at runtime and pagination metadata
 * computed from input params and result size.
 *
 * @param params - Query parameters including project_id, locale, search, missing_only, pagination
 * @returns TanStack Query result with data and metadata
 */
export function useKeysPerLanguageView(params: ListKeysPerLanguageParams) {
  const supabase = useSupabase();

  return useQuery<KeyPerLanguageViewListResponse, ApiErrorResponse>({
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      // Validate parameters
      const validated = listKeysPerLanguageViewSchema.parse(params);

      // Call RPC function for per-language view list
      const { count, data, error } = await supabase.rpc(
        'list_keys_per_language_view',
        {
          p_limit: validated.limit,
          p_locale: validated.locale,
          p_missing_only: validated.missing_only,
          p_offset: validated.offset,
          p_project_id: validated.project_id,
          p_search: validated.search,
        },
        { count: 'exact' }
      );

      if (error) {
        throw createDatabaseErrorResponse(error, 'useKeysPerLanguageView', 'Failed to fetch keys');
      }

      // Runtime validation of response data
      const keys = z.array(keyPerLanguageViewResponseSchema).parse(data || []);

      return {
        data: keys,
        metadata: {
          end: (validated.offset || 0) + keys.length - 1,
          start: validated.offset || 0,
          total: count || 0,
        },
      };
    },
    queryKey: keysKeys.perLanguageView(params.project_id, params.locale, {
      limit: params.limit,
      missing_only: params.missing_only,
      offset: params.offset,
      search: params.search,
    }),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
