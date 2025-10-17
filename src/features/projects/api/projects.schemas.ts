import { z } from 'zod';

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

// Locale code validation (BCP-47 format)
const localeCodeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// Prefix validation
const prefixSchema = z
  .string()
  .min(PROJECT_PREFIX_MIN_LENGTH, PROJECTS_ERROR_MESSAGES.PREFIX_TOO_SHORT)
  .max(PROJECT_PREFIX_MAX_LENGTH, PROJECTS_ERROR_MESSAGES.PREFIX_TOO_LONG)
  .regex(PROJECT_PREFIX_PATTERN, PROJECTS_ERROR_MESSAGES.PREFIX_INVALID_FORMAT)
  .refine((val) => !val.endsWith('.'), PROJECTS_ERROR_MESSAGES.PREFIX_TRAILING_DOT);

// List Projects Schema
export const listProjectsSchema = z.object({
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
});

// Create Project Request Schema (API input format without p_ prefix)
export const createProjectRequestSchema = z.object({
  default_locale: localeCodeSchema,
  default_locale_label: z
    .string()
    .min(PROJECT_LOCALE_LABEL_MIN_LENGTH, PROJECTS_ERROR_MESSAGES.LOCALE_LABEL_REQUIRED)
    .max(PROJECT_LOCALE_LABEL_MAX_LENGTH, PROJECTS_ERROR_MESSAGES.LOCALE_LABEL_TOO_LONG)
    .trim(),
  description: z.string().trim().optional().nullable(),
  name: z.string().min(1, PROJECTS_ERROR_MESSAGES.NAME_REQUIRED).trim(),
  prefix: prefixSchema,
});

// Create Project Schema with RPC parameter transformation (adds p_ prefix)
export const createProjectSchema = createProjectRequestSchema.transform((data) => ({
  p_default_locale: data.default_locale,
  p_default_locale_label: data.default_locale_label,
  p_description: data.description,
  p_name: data.name,
  p_prefix: data.prefix,
}));

// Update Project Schema
export const updateProjectSchema = z
  .object({
    default_locale: z.never().optional(),
    description: z.string().trim().optional().nullable(),
    name: z.string().min(1, PROJECTS_ERROR_MESSAGES.NAME_REQUIRED).trim().optional(),
    // Prevent immutable fields
    prefix: z.never().optional(),
  })
  .strict();

// Project ID Schema
export const projectIdSchema = z.string().uuid('Invalid project ID format');

// Response Schemas for runtime validation
export const projectResponseSchema = z.object({
  created_at: z.string(),
  default_locale: z.string(),
  description: z.string().nullable(),
  id: z.string().uuid(),
  name: z.string(),
  prefix: z.string(),
  updated_at: z.string(),
});

export const projectWithCountsSchema = projectResponseSchema.extend({
  key_count: z.number(),
  locale_count: z.number(),
});
