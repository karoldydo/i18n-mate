import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, KeyTranslationsRequest, KeyTranslationsResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../keys.errors';
import { KEY_PER_LANGUAGE_VIEW_RESPONSE_SCHEMA, KEY_TRANSLATIONS_SCHEMA } from '../keys.schemas';

type KeysPerLanguageQueryKey = [
  'keys-per-language-view',
  string,
  string,
  number | undefined,
  boolean | undefined,
  number | undefined,
  string | undefined,
];

/**
 * Fetch a paginated list of keys for a specific language with translation metadata
 *
 * Uses the RPC function `list_keys_per_language_view` with exact total counting
 * enabled. Returns keys with their translation values and metadata for the
 * specified locale. Data items are validated at runtime and pagination
 * metadata is computed from input params and result size.
 *
 * @param {KeyTranslationsRequest} params - Query parameters for key listing per language
 * @param {string} params.project_id - Project UUID to fetch keys from (required)
 * @param {string} params.locale - Target locale code in BCP-47 format (required, e.g., "en", "en-US")
 * @param {string} [params.search] - Search term for key name (case-insensitive contains, optional)
 * @param {boolean} [params.missing_only] - Filter keys with NULL values in selected locale (default: false)
 * @param {number} [params.limit] - Items per page (1-100, default: 50)
 * @param {number} [params.offset] - Pagination offset (min: 0, default: 0)
 *
 * @param {Object} [options] - Additional query options
 * @param {boolean} [options.enabled] - Whether automatic fetching should be enabled (default: true)
 * @param {boolean} [options.suspense] - Set to false to disable Suspense mode for this query (default: true)
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid project_id, malformed locale, limit > 100, negative offset)
 * @throws {ApiErrorResponse} 403 - Project not owned by user
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns {UseQueryResult<KeyTranslationsResponse, ApiErrorResponse> | UseSuspenseQueryResult<KeyTranslationsResponse, ApiErrorResponse>} TanStack Query result with keys data and pagination metadata
 */
export function useKeysPerLanguageView(
  params: KeyTranslationsRequest,
  options?: {
    enabled?: boolean;
    suspense?: boolean;
  }
) {
  const supabase = useSupabase();

  const queryFn = async () => {
    const { limit, locale, missing_only, offset, project_id, search } = KEY_TRANSLATIONS_SCHEMA.parse(params);

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
  };

  const queryKey: KeysPerLanguageQueryKey = [
    'keys-per-language-view',
    params.project_id,
    params.locale,
    params.limit,
    params.missing_only,
    params.offset,
    params.search,
  ];

  if (options?.suspense === false) {
    return useQuery<KeyTranslationsResponse, ApiErrorResponse>({
      enabled: options.enabled ?? true,
      queryFn,
      queryKey,
    });
  }

  return useSuspenseQuery<KeyTranslationsResponse, ApiErrorResponse>({
    queryFn,
    queryKey,
  });
}
