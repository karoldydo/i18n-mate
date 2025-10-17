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
export const TRAILING_DOT_PATTERN = /\.$/;

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
  NAME_UNIQUE_PER_OWNER: 'projects_name_unique_per_owner',
  PREFIX_UNIQUE_PER_OWNER: 'projects_prefix_unique_per_owner',
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
 * Project validation patterns and utilities
 */
export const PROJECT_VALIDATION = {
  /**
   * Validate locale label format
   * Checks length constraints
   */
  isValidLocaleLabel: (label: string): boolean => {
    if (!label || typeof label !== 'string') return false;
    const trimmed = label.trim();
    if (trimmed.length < PROJECT_LOCALE_LABEL_MIN_LENGTH || trimmed.length > PROJECT_LOCALE_LABEL_MAX_LENGTH)
      return false;
    return true;
  },

  /**
   * Client-side project prefix validation
   * Use for immediate feedback, but always verify server-side for critical operations
   *
   * Rules implemented:
   * - Must be 2-4 characters long
   * - Only lowercase letters, numbers, dots, underscores, and hyphens
   * - Cannot end with a dot
   */
  isValidPrefixClient: (prefix: string): boolean => {
    if (!prefix || typeof prefix !== 'string') return false;
    if (prefix.length < PROJECT_PREFIX_MIN_LENGTH || prefix.length > PROJECT_PREFIX_MAX_LENGTH) return false;
    if (!PROJECT_PREFIX_PATTERN.test(prefix)) return false;
    if (TRAILING_DOT_PATTERN.test(prefix)) return false;
    return true;
  },

  /**
   * Validate project description format
   * Checks length constraints
   */
  isValidProjectDescription: (description: null | string | undefined): boolean => {
    if (!description) return true; // Description is optional
    if (typeof description !== 'string') return false;
    const trimmed = description.trim();
    if (trimmed.length > PROJECT_DESCRIPTION_MAX_LENGTH) return false;
    return true;
  },

  /**
   * Validate project name format
   * Checks length constraints and basic format
   */
  isValidProjectName: (name: string): boolean => {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (trimmed.length < PROJECT_NAME_MIN_LENGTH || trimmed.length > PROJECT_NAME_MAX_LENGTH) return false;
    return true;
  },

  /**
   * Check if sort option is valid
   */
  isValidSortOption: (option: string): boolean => {
    return Object.values(PROJECT_SORT_OPTIONS).includes(
      option as (typeof PROJECT_SORT_OPTIONS)[keyof typeof PROJECT_SORT_OPTIONS]
    );
  },
};

/**
 * Error messages for project operations
 */
export const PROJECTS_ERROR_MESSAGES = {
  // Generic errors
  DATABASE_ERROR: 'Database operation failed',
  DEFAULT_LOCALE_IMMUTABLE: 'Cannot modify default locale after creation',
  DESCRIPTION_TOO_LONG: `Project description must be at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`,

  INVALID_FIELD_VALUE: 'Invalid field value',
  INVALID_PROJECT_ID: 'Invalid project ID format',
  LOCALE_LABEL_REQUIRED: 'Default locale label is required',
  LOCALE_LABEL_TOO_LONG: `Default locale label must be at most ${PROJECT_LOCALE_LABEL_MAX_LENGTH} characters`,
  // Validation errors
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
  // Database operation errors
  PROJECT_NAME_EXISTS: 'Project with this name already exists',
  PROJECT_NOT_FOUND: 'Project not found or access denied',
  REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource not found',
} as const;

/**
 * Creates a validated project prefix from a string with validation
 * Throws error if prefix format is invalid
 */
export function createProjectPrefix(prefix: string): string {
  if (!PROJECT_VALIDATION.isValidPrefixClient(prefix)) {
    throw new Error(PROJECTS_ERROR_MESSAGES.PREFIX_INVALID_FORMAT);
  }
  return prefix;
}

/**
 * Type guard that checks if string is a valid locale label
 */
export function isValidLocaleLabel(label: string): boolean {
  return PROJECT_VALIDATION.isValidLocaleLabel(label);
}

/**
 * Type guard that checks if string is a valid project name
 */
export function isValidProjectName(name: string): boolean {
  return PROJECT_VALIDATION.isValidProjectName(name);
}

/**
 * Type guard that checks if string is a valid project prefix format
 */
export function isValidProjectPrefix(prefix: string): boolean {
  return PROJECT_VALIDATION.isValidPrefixClient(prefix);
}

/**
 * Sanitize and normalize locale label
 * Trims whitespace and ensures valid format
 */
export function normalizeLocaleLabel(label: string): string {
  if (!label || typeof label !== 'string') {
    throw new Error(PROJECTS_ERROR_MESSAGES.LOCALE_LABEL_REQUIRED);
  }

  const normalized = label.trim();

  if (!isValidLocaleLabel(normalized)) {
    throw new Error(PROJECTS_ERROR_MESSAGES.LOCALE_LABEL_TOO_LONG);
  }

  return normalized;
}

/**
 * Sanitize and normalize project description
 * Trims whitespace and ensures valid format
 */
export function normalizeProjectDescription(description: null | string | undefined): null | string {
  if (!description || typeof description !== 'string') {
    return null;
  }

  const normalized = description.trim();

  if (normalized === '') {
    return null;
  }

  if (!PROJECT_VALIDATION.isValidProjectDescription(normalized)) {
    throw new Error(PROJECTS_ERROR_MESSAGES.DESCRIPTION_TOO_LONG);
  }

  return normalized;
}

/**
 * Sanitize and normalize project name
 * Trims whitespace and ensures valid format
 */
export function normalizeProjectName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error(PROJECTS_ERROR_MESSAGES.NAME_REQUIRED);
  }

  const normalized = name.trim();

  if (!isValidProjectName(normalized)) {
    throw new Error(PROJECTS_ERROR_MESSAGES.NAME_TOO_LONG);
  }

  return normalized;
}
