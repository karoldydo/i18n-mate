import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse, UpdateLocaleRequest, UpdateLocaleResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../locales.errors';
import { LOCALE_RESPONSE_SCHEMA, UPDATE_LOCALE_SCHEMA, UUID_SCHEMA } from '../locales.schemas';

/**
 * Update a project locale's label
 *
 * Updates mutable locale fields (label only). The locale code is immutable
 * after creation and attempts to modify it will result in validation errors.
 *
 * @param localeId - UUID of the locale to update
 *
 * @throws {ApiErrorResponse} 400 - Validation error (attempt to change immutable locale field)
 * @throws {ApiErrorResponse} 404 - Locale not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during update
 *
 * @returns TanStack Query mutation hook for updating locale labels
 */
export function useUpdateProjectLocale(localeId: string) {
  const supabase = useSupabase();

  return useMutation<UpdateLocaleResponse, ApiErrorResponse, UpdateLocaleRequest>({
    mutationFn: async (payload) => {
      const id = UUID_SCHEMA.parse(localeId);
      const body = UPDATE_LOCALE_SCHEMA.parse(payload);

      const { data, error } = await supabase.from('project_locales').update(body).eq('id', id).select().single();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useUpdateProjectLocale', 'Failed to update locale');
      }

      if (!data) {
        throw createApiErrorResponse(404, 'Locale not found or access denied');
      }

      return LOCALE_RESPONSE_SCHEMA.parse(data);
    },
  });
}
