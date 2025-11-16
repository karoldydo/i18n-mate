import { z } from 'zod';

import { EXPORT_ERROR_MESSAGES } from '@/shared/constants';

/**
 * Zod schema for validating export translations request parameters.
 *
 * Validates that the project ID is a valid UUID format. Used to ensure
 * export requests contain a properly formatted project identifier before
 * processing the export operation.
 *
 * @see {@link EXPORT_ERROR_MESSAGES} for validation error messages
 */
export const EXPORT_TRANSLATIONS_SCHEMA = z.object({
  project_id: z.string().uuid(EXPORT_ERROR_MESSAGES.INVALID_PROJECT_ID),
});
