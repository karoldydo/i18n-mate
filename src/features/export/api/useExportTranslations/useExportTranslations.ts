import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createEdgeFunctionErrorResponse } from '../export.errors';
import { EXPORT_TRANSLATIONS_SCHEMA } from '../export.schemas';

/**
 * Export project translations as ZIP file
 *
 * Triggers download of ZIP archive containing JSON files for each locale.
 * Uses browser download API to save file with auto-generated filename.
 *
 * @param projectId - UUID of the project to export
 *
 * @throws {ApiErrorResponse} 400 - Invalid project ID format
 * @throws {ApiErrorResponse} 401 - Authentication required
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 500 - Export generation failed
 *
 * @returns TanStack Query mutation hook for exporting translations
 */
export function useExportTranslations(projectId: string) {
  const supabase = useSupabase();

  return useMutation<unknown, ApiErrorResponse>({
    mutationFn: async () => {
      const { project_id } = EXPORT_TRANSLATIONS_SCHEMA.parse({ project_id: projectId });

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw createApiErrorResponse(401, 'Authentication required');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw createApiErrorResponse(500, 'Supabase configuration missing');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/export-translations?project_id=${project_id}`;

      const response = await fetch(functionUrl, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        method: 'GET',
      });

      if (!response.ok) {
        if (response.headers.get('content-type')?.includes('application/json')) {
          const errorData = await response.json();
          throw createEdgeFunctionErrorResponse(
            errorData.error?.message || 'Export generation failed',
            response.status,
            'useExportTranslations'
          );
        }
        throw createEdgeFunctionErrorResponse('Export generation failed', response.status, 'useExportTranslations');
      }

      const blob = await response.blob();

      let filename = `export-${projectId}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.zip`;
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const anchorElement = document.createElement('a');
      anchorElement.style.display = 'none';
      anchorElement.href = downloadUrl;
      anchorElement.download = filename;
      document.body.appendChild(anchorElement);
      anchorElement.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(anchorElement);
    },
  });
}
