/**
 * Export Constants and Configuration
 *
 * Centralized definitions for export functionality to ensure consistency
 * between Edge Function implementation and frontend validation.
 */

/**
 * Maximum file size for exports (in bytes)
 * Currently set to 50MB to handle large projects
 */
export const EXPORT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Maximum number of keys per project for export
 * Prevents timeout and memory issues
 */
export const EXPORT_MAX_KEYS_LIMIT = 100000;

/**
 * Export timeout in milliseconds (Edge Function limit)
 */
export const EXPORT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * ZIP compression level (0-9, where 9 is best compression)
 */
export const EXPORT_ZIP_COMPRESSION_LEVEL = 6;

/**
 * Error messages for export operations
 */
export const EXPORT_ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  EXPORT_GENERATION_FAILED: 'Export generation failed',
  INVALID_PROJECT_ID: 'Invalid project ID format',
  PROJECT_ID_REQUIRED: 'Project ID is required',
  PROJECT_NOT_FOUND: 'Project not found or access denied',
  PROJECT_TOO_LARGE: 'Project too large to export',
} as const;

/**
 * Export file naming patterns
 */
export const EXPORT_FILENAME_PATTERN = /^project-[a-zA-Z0-9_-]+-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.zip$/;

/**
 * Supported locale file extensions
 */
export const EXPORT_LOCALE_FILE_EXTENSION = '.json' as const;
