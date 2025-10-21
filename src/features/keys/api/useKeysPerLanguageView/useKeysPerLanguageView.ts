import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, KeyPerLanguageViewListResponse, ListKeysPerLanguageParams } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../keys.errors';
import { KEYS_KEY_FACTORY } from '../keys.key-factory';
import { KEY_PER_LANGUAGE_VIEW_RESPONSE_SCHEMA, LIST_KEYS_PER_LANGUAGE_VIEW_SCHEMA } from '../keys.schemas';

/**
 * Fetch a paginated list of keys for a specific language with translation metadata
 *
 * Uses the RPC function `list_keys_per_language_view` with exact total counting
 * enabled. Returns keys with their translation values and metadata for the
 * specified locale. Data items are validated at runtime and pagination
 * metadata is computed from input params and result size.
 *
 * @param params - Query parameters for key listing per language
 * @param params.project_id - Project UUID to fetch keys from (required)
 * @param params.locale - Target locale code in BCP-47 format (required, e.g., "en", "en-US")
 * @param params.search - Search term for key name (case-insensitive contains, optional)
 * @param params.missing_only - Filter keys with NULL values in selected locale (default: false)
 * @param params.limit - Items per page (1-100, default: 50)
 * @param params.offset - Pagination offset (min: 0, default: 0)
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid project_id, malformed locale, limit > 100, negative offset)
 * @throws {ApiErrorResponse} 403 - Project not owned by user
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns TanStack Query result with keys data and pagination metadata
 */
export function useKeysPerLanguageView(params: ListKeysPerLanguageParams) {
  const supabase = useSupabase();

  return useQuery<KeyPerLanguageViewListResponse, ApiErrorResponse>({
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      const { limit, locale, missing_only, offset, project_id, search } =
        LIST_KEYS_PER_LANGUAGE_VIEW_SCHEMA.parse(params);

      const { count, data, error } = await supabase.rpc(
        'list_keys_per_language_view',
        {
          p_limit: limit,
          p_locale: locale,
          p_missing_only: missing_only,
          p_offset: offset,
          p_project_id: project_id,
          p_search: search,
        },
        { count: 'exact' }
      );

      if (error) {
        throw createDatabaseErrorResponse(error, 'useKeysPerLanguageView', 'Failed to fetch keys');
      }

      // runtime validation of response data
      const keys = z.array(KEY_PER_LANGUAGE_VIEW_RESPONSE_SCHEMA).parse(data || []);

      return {
        data: keys,
        metadata: {
          end: (offset || 0) + keys.length - 1,
          start: offset || 0,
          total: count || 0,
        },
      };
    },
    queryKey: KEYS_KEY_FACTORY.perLanguageView(params.project_id, params.locale, {
      limit: params.limit,
      missing_only: params.missing_only,
      offset: params.offset,
      search: params.search,
    }),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
