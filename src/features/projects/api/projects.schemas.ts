import { z } from 'zod';

import type { CreateProjectRequest, CreateProjectRpcArgs, ProjectsRequest, UpdateProjectRequest } from '@/shared/types';

import {
  PROJECT_LOCALE_LABEL_MAX_LENGTH,
  PROJECT_LOCALE_LABEL_MIN_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_PREFIX_MAX_LENGTH,
  PROJECT_PREFIX_MIN_LENGTH,
  PROJECT_PREFIX_PATTERN,
  PROJECT_SORT_OPTIONS,
  PROJECTS_DEFAULT_LIMIT,
  PROJECTS_ERROR_MESSAGES,
  PROJECTS_MAX_LIMIT,
  PROJECTS_MIN_OFFSET,
} from '@/shared/constants';

// locale code validation: BCP-47 format, accepts mixed case, normalized by DB trigger
const LOCALE_CODE_INPUT_PATTERN = /^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/;
const LOCALE_CODE_SCHEMA = z
  .string()
  .min(1, 'Default locale is required')
  .max(5, 'Locale code must be at most 5 characters')
  .regex(LOCALE_CODE_INPUT_PATTERN, 'Locale must be in BCP-47 format (e.g., "en" or "en-US")');

// prefix validation
const PREFIX_SCHEMA = z
  .string()
  .min(PROJECT_PREFIX_MIN_LENGTH, PROJECTS_ERROR_MESSAGES.PREFIX_TOO_SHORT)
  .max(PROJECT_PREFIX_MAX_LENGTH, PROJECTS_ERROR_MESSAGES.PREFIX_TOO_LONG)
  .regex(PROJECT_PREFIX_PATTERN, PROJECTS_ERROR_MESSAGES.PREFIX_INVALID_FORMAT)
  .refine((value) => !value.endsWith('.'), PROJECTS_ERROR_MESSAGES.PREFIX_TRAILING_DOT);

/**
 * Zod schema for validating project list request parameters
 *
 * Validates pagination and sorting parameters for fetching a list of projects.
 * Provides default values for limit, offset, and order when not specified.
 *
 * @returns {z.ZodType<ProjectsRequest>} Zod schema for projects request
 */
export const PROJECTS_REQUEST_SCHEMA = z.object({
  limit: z.number().int().min(1).max(PROJECTS_MAX_LIMIT).optional().default(PROJECTS_DEFAULT_LIMIT),
  offset: z.number().int().min(PROJECTS_MIN_OFFSET).optional().default(PROJECTS_MIN_OFFSET),
  order: z
    .enum([
      PROJECT_SORT_OPTIONS.NAME_ASC,
      PROJECT_SORT_OPTIONS.NAME_DESC,
      PROJECT_SORT_OPTIONS.CREATED_AT_ASC,
      PROJECT_SORT_OPTIONS.CREATED_AT_DESC,
    ])
    .optional()
    .default(PROJECT_SORT_OPTIONS.NAME_ASC),
}) satisfies z.ZodType<ProjectsRequest>;

/**
 * Zod schema for validating create project request data
 *
 * Validates project creation input including name, description, prefix, default locale,
 * and locale label. Enforces length constraints, format validation, and required fields.
 *
 * @returns {z.ZodType<CreateProjectRequest>} Zod schema for create project request
 */
export const CREATE_PROJECT_REQUEST_SCHEMA = z.object({
  default_locale: LOCALE_CODE_SCHEMA,
  default_locale_label: z
    .string()
    .min(PROJECT_LOCALE_LABEL_MIN_LENGTH, PROJECTS_ERROR_MESSAGES.LOCALE_LABEL_REQUIRED)
    .max(PROJECT_LOCALE_LABEL_MAX_LENGTH, PROJECTS_ERROR_MESSAGES.LOCALE_LABEL_TOO_LONG)
    .trim(),
  description: z.string().trim().optional().nullable(),
  name: z
    .string()
    .min(1, PROJECTS_ERROR_MESSAGES.NAME_REQUIRED)
    .max(PROJECT_NAME_MAX_LENGTH, PROJECTS_ERROR_MESSAGES.NAME_TOO_LONG)
    .trim(),
  prefix: PREFIX_SCHEMA,
}) satisfies z.ZodType<CreateProjectRequest>;

/**
 * Zod schema for create project with RPC parameter transformation
 *
 * Transforms the create project request schema to match the RPC function signature
 * by adding the `p_` prefix to all parameter names. Used when calling the database
 * RPC function `create_project_with_default_locale`.
 *
 * @returns {z.ZodEffects<CreateProjectRequest, CreateProjectRpcArgs>} Zod schema with transformation
 */
export const CREATE_PROJECT_SCHEMA = CREATE_PROJECT_REQUEST_SCHEMA.transform(
  (data): CreateProjectRpcArgs => ({
    p_default_locale: data.default_locale,
    p_default_locale_label: data.default_locale_label,
    p_description: data.description ?? undefined,
    p_name: data.name,
    p_prefix: data.prefix,
  })
);

/**
 * Zod schema for validating update project request data
 *
 * Validates project update input, allowing only mutable fields (name and description).
 * Prevents updates to immutable fields (prefix and default_locale) by using `z.never()`.
 * Uses strict mode to reject unknown fields.
 *
 * @returns {z.ZodType<UpdateProjectRequest>} Zod schema for update project request
 */
export const UPDATE_PROJECT_SCHEMA = z
  .object({
    default_locale: z.never().optional(),
    description: z.string().trim().optional().nullable(),
    name: z
      .string()
      .min(1, PROJECTS_ERROR_MESSAGES.NAME_REQUIRED)
      .max(PROJECT_NAME_MAX_LENGTH, PROJECTS_ERROR_MESSAGES.NAME_TOO_LONG)
      .trim()
      .optional(),
    // prevent immutable fields
    prefix: z.never().optional(),
  })
  .strict() satisfies z.ZodType<UpdateProjectRequest>;

/**
 * Zod schema for validating UUID strings
 *
 * Validates that a string is a valid UUID format. Used for project ID validation
 * in API hooks and route parameters.
 *
 * @returns {z.ZodString} Zod schema for UUID validation
 */
export const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

/**
 * Zod schema for validating create project response data
 *
 * Validates the response structure returned from the create project RPC function.
 * Includes all project fields with their expected types and formats.
 *
 * @returns {z.ZodObject} Zod schema for create project response
 */
export const CREATE_PROJECT_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  default_locale: z.string(),
  description: z.string().nullable(),
  id: z.string().uuid(),
  name: z.string(),
  prefix: z.string(),
  updated_at: z.string(),
});

/**
 * Zod schema for validating project response data with counts
 *
 * Validates the response structure for a single project including aggregated
 * counts for locales and translation keys. Used when fetching project details.
 *
 * @returns {z.ZodObject} Zod schema for project response with counts
 */
export const PROJECT_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  default_locale: z.string(),
  description: z.string().nullable(),
  id: z.string().uuid(),
  key_count: z.number(),
  locale_count: z.number(),
  name: z.string(),
  prefix: z.string(),
  updated_at: z.string(),
});

/**
 * Zod schema for validating project list item response data
 *
 * Extends the project response schema to include total_count for pagination.
 * Used when validating items in the paginated projects list response.
 *
 * @returns {z.ZodObject} Zod schema for project list item response
 */
export const PROJECTS_RESPONSE_ITEM_SCHEMA = PROJECT_RESPONSE_SCHEMA.extend({
  total_count: z.number(),
});
