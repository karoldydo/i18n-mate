/**
 * Projects Constants and Validation Patterns
 *
 * Centralized definitions for project validation patterns to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL domain constraints.
 *
 * All patterns follow project-specific naming and validation rules.
 */

/**
 * Project prefix pattern - matches lowercase letters, numbers, dots, underscores, and hyphens
 * Examples: app, api, admin, web-ui, core_app, v2.0
 *
 * Pattern breakdown:
 * - ^[a-z0-9._-]+ : start with allowed characters
 * - $ : end of string
 *
 * Note: Additional validation prevents trailing dots
 */
export const PROJECT_PREFIX_PATTERN = /^[a-z0-9._-]+$/;

/**
 * Pattern to detect trailing dots (invalid)
 * Used for validation refinement
 */
export const PROJECT_TRAILING_DOT_PATTERN = /\.$/;

/**
 * Minimum length for project prefix
 */
export const PROJECT_PREFIX_MIN_LENGTH = 2;

/**
 * Maximum length for project prefix
 */
export const PROJECT_PREFIX_MAX_LENGTH = 4;

/**
 * Minimum length for project name
 */
export const PROJECT_NAME_MIN_LENGTH = 1;

/**
 * Maximum length for project name (CITEXT column)
 */
export const PROJECT_NAME_MAX_LENGTH = 255;

/**
 * Maximum length for project description
 */
export const PROJECT_DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Maximum length for locale label (human-readable name)
 */
export const PROJECT_LOCALE_LABEL_MAX_LENGTH = 64;

/**
 * Minimum length for locale label
 */
export const PROJECT_LOCALE_LABEL_MIN_LENGTH = 1;

/**
 * Default pagination limit for project lists
 */
export const PROJECTS_DEFAULT_LIMIT = 50;

/**
 * Maximum pagination limit for project lists
 */
export const PROJECTS_MAX_LIMIT = 100;

/**
 * Minimum pagination offset
 */
export const PROJECTS_MIN_OFFSET = 0;

/**
 * PostgreSQL error codes relevant to projects operations
 */
export const PROJECTS_PG_ERROR_CODES = {
  /** Check constraint violation */
  CHECK_VIOLATION: '23514',
  /** Foreign key violation */
  FOREIGN_KEY_VIOLATION: '23503',
  /** Unique constraint violation */
  UNIQUE_VIOLATION: '23505',
} as const;

/**
 * Database constraint names for projects
 */
export const PROJECTS_CONSTRAINTS = {
  NAME_UNIQUE_PER_OWNER: 'idx_projects_owner_name_unique',
  PREFIX_UNIQUE_PER_OWNER: 'idx_projects_owner_prefix_unique',
} as const;

/**
 * Available sorting options for project lists
 */
export const PROJECT_SORT_OPTIONS = {
  CREATED_AT_ASC: 'created_at.asc',
  CREATED_AT_DESC: 'created_at.desc',
  NAME_ASC: 'name.asc',
  NAME_DESC: 'name.desc',
} as const;

/**
 * Error messages for project operations
 */
export const PROJECTS_ERROR_MESSAGES = {
  DATABASE_ERROR: 'Database operation failed',
  DEFAULT_LOCALE_IMMUTABLE: 'Cannot modify default locale after creation',
  DESCRIPTION_TOO_LONG: `Project description must be at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`,
  INVALID_FIELD_VALUE: 'Invalid field value',
  INVALID_PROJECT_ID: 'Invalid project ID format',
  LOCALE_LABEL_REQUIRED: 'Default locale label is required',
  LOCALE_LABEL_TOO_LONG: `Default locale label must be at most ${PROJECT_LOCALE_LABEL_MAX_LENGTH} characters`,
  NAME_REQUIRED: 'Project name is required',
  NAME_TOO_LONG: `Project name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`,
  NO_DATA_RETURNED: 'No data returned from server',
  PREFIX_ALREADY_IN_USE: 'Prefix is already in use',
  PREFIX_IMMUTABLE: 'Cannot modify prefix after creation',
  PREFIX_INVALID_FORMAT: 'Prefix can only contain lowercase letters, numbers, dots, underscores, and hyphens',
  PREFIX_REQUIRED: 'Project prefix is required',
  PREFIX_TOO_LONG: `Prefix must be at most ${PROJECT_PREFIX_MAX_LENGTH} characters`,
  PREFIX_TOO_SHORT: `Prefix must be at least ${PROJECT_PREFIX_MIN_LENGTH} characters`,
  PREFIX_TRAILING_DOT: 'Prefix cannot end with a dot',
  PROJECT_NAME_EXISTS: 'Project with this name already exists',
  PROJECT_NOT_FOUND: 'Project not found or access denied',
  REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource not found',
} as const;
