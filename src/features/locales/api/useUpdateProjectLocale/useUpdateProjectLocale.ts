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
import { localesKeys } from '../locales.keys';
import { localeIdSchema, projectLocaleResponseSchema, updateProjectLocaleSchema } from '../locales.schemas';

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
 * @throws {ApiErrorResponse} 400 - Validation error (attempt to change immutable locale field)
 * @throws {ApiErrorResponse} 404 - Locale not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during update
 * @returns TanStack Query mutation hook for updating locale labels with optimistic updates
 */
export function useUpdateProjectLocale(projectId: string, localeId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectLocaleResponse, ApiErrorResponse, UpdateProjectLocaleRequest, UpdateProjectLocaleContext>({
    mutationFn: async (updateData) => {
      // Validate inputs
      const validatedId = localeIdSchema.parse(localeId);
      const validatedInput = updateProjectLocaleSchema.parse(updateData);

      const { data, error } = await supabase
        .from('project_locales')
        .update(validatedInput)
        .eq('id', validatedId)
        .select()
        .single();

      // Handle database errors
      if (error) {
        throw createDatabaseErrorResponse(error, 'useUpdateProjectLocale', 'Failed to update locale');
      }

      // Handle missing data (locale not found or access denied)
      if (!data) {
        throw createApiErrorResponse(404, 'Locale not found or access denied');
      }

      // Runtime validation of response data
      const validatedResponse = projectLocaleResponseSchema.parse(data);
      return validatedResponse;
    },
    onError: (_err, _newData, context) => {
      // Rollback on error
      if (context?.previousLocales) {
        queryClient.setQueryData(localesKeys.list(projectId), context.previousLocales);
      }
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: localesKeys.list(projectId) });

      // Snapshot previous value
      const previousLocales = queryClient.getQueryData<ProjectLocaleWithDefault[]>(localesKeys.list(projectId));

      // Optimistically update
      queryClient.setQueryData(localesKeys.list(projectId), (old: ProjectLocaleWithDefault[] | undefined) => {
        // Guard clause: prevent errors if cache is empty
        if (!old) return old;
        return old.map((locale) => (locale.id === localeId ? { ...locale, ...newData } : locale));
      });

      return { previousLocales };
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: localesKeys.list(projectId) });
    },
  });
}
