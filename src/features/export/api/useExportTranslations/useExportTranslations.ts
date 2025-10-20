import { useMutation } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createEdgeFunctionErrorResponse } from '../export.errors';
import { exportTranslationsSchema } from '../export.schemas';

/**
 * Export project translations as ZIP file
 *
 * Triggers download of ZIP archive containing JSON files for each locale.
 * Uses browser download API to save file with auto-generated filename.
 *
 * @param projectId - UUID of the project to export
 * @throws {ApiErrorResponse} 400 - Invalid project ID format
 * @throws {ApiErrorResponse} 401 - Authentication required
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 500 - Export generation failed
 * @returns TanStack Query mutation hook for exporting translations
 */
export function useExportTranslations(projectId: string) {
  const supabase = useSupabase();

  return useMutation<unknown, ApiErrorResponse>({
    mutationFn: async () => {
      // Validate project ID
      const validated = exportTranslationsSchema.parse({ project_id: projectId });

      // Get current session for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw createApiErrorResponse(401, 'Authentication required');
      }

      // Get Supabase configuration from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw createApiErrorResponse(500, 'Supabase configuration missing');
      }

      // Call Edge Function with authenticated fetch
      const functionUrl = `${supabaseUrl}/functions/v1/export-translations?project_id=${validated.project_id}`;

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

      // Handle successful ZIP response
      const blob = await response.blob();

      // Extract filename from Content-Disposition header or generate fallback
      let filename = `export-${projectId}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.zip`;
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}
