import { z } from 'zod';

import type {
  CreateProjectRpcArgs,
  CreateProjectWithDefaultLocaleRequest,
  ListProjectsParams,
  ProjectResponse,
  ProjectWithCounts,
  UpdateProjectRequest,
} from '@/shared/types';

import {
  PROJECT_LOCALE_LABEL_MAX_LENGTH,
  PROJECT_LOCALE_LABEL_MIN_LENGTH,
  PROJECT_PREFIX_MAX_LENGTH,
  PROJECT_PREFIX_MIN_LENGTH,
  PROJECT_PREFIX_PATTERN,
  PROJECT_SORT_OPTIONS,
  PROJECTS_DEFAULT_LIMIT,
  PROJECTS_ERROR_MESSAGES,
  PROJECTS_MAX_LIMIT,
  PROJECTS_MIN_OFFSET,
} from '@/shared/constants';

// locale code validation (bcp-47 format)
const LOCALE_CODE_SCHEMA = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// prefix validation
const PREFIX_SCHEMA = z
  .string()
  .min(PROJECT_PREFIX_MIN_LENGTH, PROJECTS_ERROR_MESSAGES.PREFIX_TOO_SHORT)
  .max(PROJECT_PREFIX_MAX_LENGTH, PROJECTS_ERROR_MESSAGES.PREFIX_TOO_LONG)
  .regex(PROJECT_PREFIX_PATTERN, PROJECTS_ERROR_MESSAGES.PREFIX_INVALID_FORMAT)
  .refine((value) => !value.endsWith('.'), PROJECTS_ERROR_MESSAGES.PREFIX_TRAILING_DOT);

// list projects schema
export const LIST_PROJECTS_SCHEMA = z.object({
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
}) satisfies z.ZodType<ListProjectsParams>;

// create project request schema (api input format without p_ prefix)
export const CREATE_PROJECT_REQUEST_SCHEMA = z.object({
  default_locale: LOCALE_CODE_SCHEMA,
  default_locale_label: z
    .string()
    .min(PROJECT_LOCALE_LABEL_MIN_LENGTH, PROJECTS_ERROR_MESSAGES.LOCALE_LABEL_REQUIRED)
    .max(PROJECT_LOCALE_LABEL_MAX_LENGTH, PROJECTS_ERROR_MESSAGES.LOCALE_LABEL_TOO_LONG)
    .trim(),
  description: z.string().trim().optional().nullable(),
  name: z.string().min(1, PROJECTS_ERROR_MESSAGES.NAME_REQUIRED).trim(),
  prefix: PREFIX_SCHEMA,
}) satisfies z.ZodType<CreateProjectWithDefaultLocaleRequest>;

// create project schema with rpc parameter transformation (adds p_ prefix)
export const CREATE_PROJECT_SCHEMA = CREATE_PROJECT_REQUEST_SCHEMA.transform(
  (data): CreateProjectRpcArgs => ({
    p_default_locale: data.default_locale,
    p_default_locale_label: data.default_locale_label,
    p_description: data.description ?? undefined,
    p_name: data.name,
    p_prefix: data.prefix,
  })
);

// update project schema
export const UPDATE_PROJECT_SCHEMA = z
  .object({
    default_locale: z.never().optional(),
    description: z.string().trim().optional().nullable(),
    name: z.string().min(1, PROJECTS_ERROR_MESSAGES.NAME_REQUIRED).trim().optional(),
    // prevent immutable fields
    prefix: z.never().optional(),
  })
  .strict() satisfies z.ZodType<UpdateProjectRequest>;

// UUID schema
export const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

// response schemas for runtime validation
export const PROJECT_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  default_locale: z.string(),
  description: z.string().nullable(),
  id: z.string().uuid(),
  name: z.string(),
  prefix: z.string(),
  updated_at: z.string(),
}) satisfies z.ZodType<ProjectResponse>;

export const PROJECT_WITH_COUNTS_SCHEMA = PROJECT_RESPONSE_SCHEMA.extend({
  key_count: z.number(),
  locale_count: z.number(),
}) satisfies z.ZodType<ProjectWithCounts>;
