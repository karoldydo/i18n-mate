import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  ApiErrorResponse,
  ProjectLocaleResponse,
  ProjectLocaleWithDefault,
  UpdateProjectLocaleRequest,
} from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../locales.errors';
import { LOCALES_KEYS } from '../locales.key-factory';
import { PROJECT_LOCALE_RESPONSE_SCHEMA, UPDATE_PROJECT_LOCALE_SCHEMA, UUID_SCHEMA } from '../locales.schemas';

/**
 * Context type for mutation callbacks
 */
interface UpdateProjectLocaleContext {
  previousLocales?: ProjectLocaleWithDefault[];
}

/**
 * Update a project locale's label with optimistic UI updates
 *
 * Updates mutable locale fields (label only). The locale code is immutable
 * after creation and attempts to modify it will result in validation errors.
 * Uses optimistic updates to provide instant UI feedback, with automatic
 * rollback on error and revalidation on settle.
 *
 * @param projectId - UUID of the project containing the locale
 * @param localeId - UUID of the locale to update
 *
 * @throws {ApiErrorResponse} 400 - Validation error (attempt to change immutable locale field)
 * @throws {ApiErrorResponse} 404 - Locale not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during update
 *
 * @returns TanStack Query mutation hook for updating locale labels with optimistic updates
 */
export function useUpdateProjectLocale(projectId: string, localeId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectLocaleResponse, ApiErrorResponse, UpdateProjectLocaleRequest, UpdateProjectLocaleContext>({
    mutationFn: async (payload) => {
      const id = UUID_SCHEMA.parse(localeId);
      const body = UPDATE_PROJECT_LOCALE_SCHEMA.parse(payload);

      const { data, error } = await supabase.from('project_locales').update(body).eq('id', id).select().single();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useUpdateProjectLocale', 'Failed to update locale');
      }

      if (!data) {
        throw createApiErrorResponse(404, 'Locale not found or access denied');
      }

      return PROJECT_LOCALE_RESPONSE_SCHEMA.parse(data);
    },
    onError: (_err, _newData, context) => {
      // rollback on error
      if (context?.previousLocales) {
        queryClient.setQueryData(LOCALES_KEYS.list(projectId), context.previousLocales);
      }
    },
    onMutate: async (newData) => {
      // cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: LOCALES_KEYS.list(projectId) });

      // snapshot previous value
      const PREVIOUS_LOCALES = queryClient.getQueryData<ProjectLocaleWithDefault[]>(LOCALES_KEYS.list(projectId));

      // optimistically update
      queryClient.setQueryData(LOCALES_KEYS.list(projectId), (old: ProjectLocaleWithDefault[] | undefined) => {
        // guard clause: prevent errors if cache is empty
        if (!old) return old;
        return old.map((locale) => (locale.id === localeId ? { ...locale, ...newData } : locale));
      });

      return { previousLocales: PREVIOUS_LOCALES };
    },
    onSettled: () => {
      // refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: LOCALES_KEYS.list(projectId) });
    },
  });
}
