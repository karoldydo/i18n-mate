/**
 * Project prefix pattern - matches lowercase letters, numbers, dots, underscores, and hyphens.
 * Examples: app, api, admin, web-ui, core_app, v2.0
 *
 * Pattern breakdown:
 * - ^[a-z0-9._-]+ : start with allowed characters
 * - $ : end of string
 *
 * Note: Additional validation prevents trailing dots.
 *
 * @type {RegExp}
 */
export const PROJECT_PREFIX_PATTERN = /^[a-z0-9._-]+$/;

/**
 * Pattern to detect trailing dots (invalid).
 * Used for validation refinement.
 *
 * @type {RegExp}
 */
export const PROJECT_TRAILING_DOT_PATTERN = /\.$/;

/**
 * Minimum length for project prefix.
 *
 * @type {number}
 */
export const PROJECT_PREFIX_MIN_LENGTH = 2;

/**
 * Maximum length for project prefix.
 *
 * @type {number}
 */
export const PROJECT_PREFIX_MAX_LENGTH = 4;

/**
 * Minimum length for project name.
 *
 * @type {number}
 */
export const PROJECT_NAME_MIN_LENGTH = 1;

/**
 * Maximum length for project name (CITEXT column).
 *
 * @type {number}
 */
export const PROJECT_NAME_MAX_LENGTH = 255;

/**
 * Maximum length for project description.
 *
 * @type {number}
 */
export const PROJECT_DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Maximum length for locale label (human-readable name).
 *
 * @type {number}
 */
export const PROJECT_LOCALE_LABEL_MAX_LENGTH = 64;

/**
 * Minimum length for locale label.
 *
 * @type {number}
 */
export const PROJECT_LOCALE_LABEL_MIN_LENGTH = 1;

/**
 * Default pagination limit for project lists.
 *
 * @type {number}
 */
export const PROJECTS_DEFAULT_LIMIT = 50;

/**
 * Maximum pagination limit for project lists.
 *
 * @type {number}
 */
export const PROJECTS_MAX_LIMIT = 100;

/**
 * Minimum pagination offset.
 *
 * @type {number}
 */
export const PROJECTS_MIN_OFFSET = 0;

/**
 * PostgreSQL error codes relevant to projects operations.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const PROJECTS_PG_ERROR_CODES = {
  CHECK_VIOLATION: '23514',
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
} as const;

/**
 * Database constraint names for projects.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const PROJECTS_CONSTRAINTS = {
  NAME_UNIQUE_PER_OWNER: 'projects_name_unique_per_owner',
  PREFIX_UNIQUE_PER_OWNER: 'projects_prefix_unique_per_owner',
} as const;

/**
 * Available sorting options for project lists.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const PROJECT_SORT_OPTIONS = {
  CREATED_AT_ASC: 'created_at.asc',
  CREATED_AT_DESC: 'created_at.desc',
  NAME_ASC: 'name.asc',
  NAME_DESC: 'name.desc',
} as const;

/**
 * Error messages for project operations.
 *
 * Note: Some error messages are API-layer only (client-side validation),
 * while others map directly to database error codes from migrations.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const PROJECTS_ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  DATABASE_ERROR: 'Database operation failed',
  DEFAULT_LOCALE_CANNOT_DELETE: 'Cannot delete default locale',
  DEFAULT_LOCALE_IMMUTABLE: 'Cannot modify default locale after creation',
  DESCRIPTION_TOO_LONG: `Project description must be at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`, // API-layer
  DUPLICATE_CONSTRAINT: 'Duplicate constraint violation',
  INVALID_FIELD_VALUE: 'Invalid field value', // API-layer
  INVALID_PROJECT_ID: 'Invalid project ID format', // API-layer
  LOCALE_LABEL_REQUIRED: 'Default locale label is required', // API-layer
  LOCALE_LABEL_TOO_LONG: `Default locale label must be at most ${PROJECT_LOCALE_LABEL_MAX_LENGTH} characters`, // API-layer
  NAME_REQUIRED: 'Project name is required', // API-layer
  NAME_TOO_LONG: `Project name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`, // API-layer
  NO_DATA_RETURNED: 'No data returned from server', // API-layer
  PREFIX_ALREADY_IN_USE: 'Prefix is already in use', // DUPLICATE_PROJECT_PREFIX
  PREFIX_IMMUTABLE: 'Cannot modify prefix after creation',
  PREFIX_INVALID_FORMAT: 'Prefix can only contain lowercase letters, numbers, dots, underscores, and hyphens', // API-layer
  PREFIX_REQUIRED: 'Project prefix is required', // API-layer
  PREFIX_TOO_LONG: `Prefix must be at most ${PROJECT_PREFIX_MAX_LENGTH} characters`, // API-layer
  PREFIX_TOO_SHORT: `Prefix must be at least ${PROJECT_PREFIX_MIN_LENGTH} characters`, // API-layer
  PREFIX_TRAILING_DOT: 'Prefix cannot end with a dot', // API-layer
  PROJECT_ACCESS_DENIED: 'Access to project denied',
  PROJECT_CREATION_FAILED: 'Failed to create project',
  PROJECT_NAME_EXISTS: 'Project with this name already exists', // DUPLICATE_PROJECT_NAME
  PROJECT_NOT_FOUND: 'Project not found or access denied',
  REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource not found', // API-layer
} as const;
