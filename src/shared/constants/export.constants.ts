/**
 * Error messages for export operations.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const EXPORT_ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  EXPORT_GENERATION_FAILED: 'Export generation failed',
  INVALID_PROJECT_ID: 'Invalid project ID format',
  PROJECT_ID_REQUIRED: 'Project ID is required',
  PROJECT_NOT_FOUND: 'Project not found or access denied',
  PROJECT_TOO_LARGE: 'Project too large to export',
} as const;
