import { z } from 'zod';

// Locale code validation (BCP-47 format)
const localeCodeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// Prefix validation
const prefixSchema = z
  .string()
  .min(2, 'Prefix must be at least 2 characters')
  .max(4, 'Prefix must be at most 4 characters')
  .regex(/^[a-z0-9._-]+$/, 'Prefix can only contain lowercase letters, numbers, dots, underscores, and hyphens')
  .refine((val) => !val.endsWith('.'), 'Prefix cannot end with a dot');

// List Projects Schema
export const listProjectsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  order: z.enum(['name.asc', 'name.desc', 'created_at.asc', 'created_at.desc']).optional().default('name.asc'),
});

// Create Project Request Schema (API input format without p_ prefix)
export const createProjectRequestSchema = z.object({
  default_locale: localeCodeSchema,
  default_locale_label: z.string().min(1, 'Default locale label is required').trim(),
  description: z.string().trim().optional().nullable(),
  name: z.string().min(1, 'Project name is required').trim(),
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
    name: z.string().min(1, 'Project name cannot be empty').trim().optional(),
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
