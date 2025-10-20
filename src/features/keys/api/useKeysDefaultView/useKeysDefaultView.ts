import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, KeyDefaultViewListResponse, ListKeysDefaultViewParams } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../keys.errors';
import { KEYS_KEY_FACTORY } from '../keys.key-factory';
import { KEY_DEFAULT_VIEW_RESPONSE_SCHEMA, LIST_KEYS_DEFAULT_VIEW_SCHEMA } from '../keys.schemas';

/**
 * Fetch a paginated list of keys in default language view with missing counts
 *
 * Uses the RPC function `list_keys_default_view` with exact total counting
 * enabled. Returns keys with their default locale values and missing counts
 * for other locales. Data items are validated at runtime and pagination
 * metadata is computed from input params and result size.
 *
 * @param params - Query parameters for key listing
 * @param params.project_id - Project UUID to fetch keys from (required)
 * @param params.search - Search term for key name (case-insensitive contains, optional)
 * @param params.missing_only - Filter keys with missing translations (default: false)
 * @param params.limit - Items per page (1-100, default: 50)
 * @param params.offset - Pagination offset (min: 0, default: 0)
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid project_id, limit > 100, negative offset)
 * @throws {ApiErrorResponse} 403 - Project not owned by user
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns TanStack Query result with keys data and pagination metadata
 */
export function useKeysDefaultView(params: ListKeysDefaultViewParams) {
  const supabase = useSupabase();

  return useQuery<KeyDefaultViewListResponse, ApiErrorResponse>({
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      const validated = LIST_KEYS_DEFAULT_VIEW_SCHEMA.parse(params);

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

      // runtime validation of response data
      const keys = z.array(KEY_DEFAULT_VIEW_RESPONSE_SCHEMA).parse(data || []);

      return {
        data: keys,
        metadata: {
          end: (validated.offset || 0) + keys.length - 1,
          start: validated.offset || 0,
          total: count || 0,
        },
      };
    },
    queryKey: KEYS_KEY_FACTORY.defaultView(params.project_id, {
      limit: params.limit,
      missing_only: params.missing_only,
      offset: params.offset,
      search: params.search,
    }),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
