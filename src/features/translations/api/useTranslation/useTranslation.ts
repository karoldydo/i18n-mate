import { useQuery } from '@tanstack/react-query';

import type { ApiErrorResponse, TranslationResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../translations.errors';
import { TRANSLATIONS_KEYS } from '../translations.key-factory';
import { GET_TRANSLATION_QUERY_SCHEMA, TRANSLATION_RESPONSE_SCHEMA } from '../translations.schemas';

/**
 * Fetch a translation record for a specific project, key, and locale combination
 *
 * Retrieves a single translation record using direct table access with composite
 * primary key lookup. Returns null if translation doesn't exist (valid state for
 * missing translations). Uses maybeSingle() to handle zero-or-one results.
 * RLS policies ensure only project owners can access translations.
 *
 * @param projectId - Project UUID to fetch translation from (required)
 * @param keyId - Translation key UUID (required)
 * @param locale - Target locale code in BCP-47 format (required, e.g., "en", "en-US")
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid project_id, key_id, or locale format)
 * @throws {ApiErrorResponse} 403 - Project not owned by user
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns TanStack Query result with translation data or null if not found
 */
export function useTranslation(projectId: string, keyId: string, locale: string) {
  const supabase = useSupabase();

  return useQuery<null | TranslationResponse, ApiErrorResponse>({
    gcTime: 15 * 60 * 1000, // 15 minutes
    queryFn: async () => {
      // validate parameters
      const validated = GET_TRANSLATION_QUERY_SCHEMA.parse({
        key_id: keyId,
        locale: locale,
        project_id: projectId,
      });

      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .eq('project_id', validated.project_id)
        .eq('key_id', validated.key_id)
        .eq('locale', validated.locale)
        .maybeSingle();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useTranslation', 'Failed to fetch translation');
      }

      // return null if translation doesn't exist (valid state for missing translations)
      if (!data) {
        return null;
      }

      // runtime validation of response data
      return TRANSLATION_RESPONSE_SCHEMA.parse(data);
    },
    queryKey: TRANSLATIONS_KEYS.detail(projectId, keyId, locale),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
