import { z } from 'zod';

import { EXPORT_ERROR_MESSAGES } from '@/shared/constants';

/**
 * Export Translations Request Schema
 */
export const exportTranslationsSchema = z.object({
  project_id: z.string().uuid(EXPORT_ERROR_MESSAGES.INVALID_PROJECT_ID),
});

/**
 * Project ID Schema
 */
export const projectIdSchema = z.string().uuid(EXPORT_ERROR_MESSAGES.INVALID_PROJECT_ID);

/**
 * Export response validation (for Edge Function testing)
 */
export const exportResponseHeadersSchema = z.object({
  'content-disposition': z.string().regex(/^attachment; filename=".+\.zip"$/),
  'content-type': z.literal('application/zip'),
});
