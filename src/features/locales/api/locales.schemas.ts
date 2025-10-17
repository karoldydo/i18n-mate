import { z } from 'zod';

import type {
  CreateProjectLocaleAtomicRequest,
  CreateProjectLocaleRequest,
  ListProjectLocalesWithDefaultArgs,
  ProjectLocaleWithDefault,
  UpdateProjectLocaleRequest,
} from '@/shared/types';

import { isValidLocaleFormatClient } from './locales.utils';

/**
 * Locale code validation (BCP-47 format: ll or ll-CC)
 *
 * Uses unified validation that matches database-level rules:
 * - Length: 2-5 characters
 * - Format: ll or ll-CC (language-country)
 * - Only letters and one dash allowed
 * - No multiple regions/scripts/variants
 *
 * Examples:
 * - Valid: "en", "pl", "en-US", "pt-BR"
 * - Invalid: "ENG", "en_US", "english", "en-US-x-private"
 */
const localeCodeSchema = z.string().refine((value) => isValidLocaleFormatClient(value), {
  message: 'Locale must be in BCP-47 format (ll or ll-CC, max 5 chars)',
});

/**
 * Locale label validation
 *
 * Requirements:
 * - Non-empty string
 * - Maximum 64 characters
 * - Leading/trailing whitespace trimmed
 */
const localeLabelSchema = z
  .string()
  .min(1, 'Locale label is required')
  .max(64, 'Locale label must be at most 64 characters')
  .trim();

/**
 * List Project Locales with Default Schema
 *
 * Used for validating parameters when fetching project locales
 */
export const listProjectLocalesWithDefaultSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
}) satisfies z.ZodType<ListProjectLocalesWithDefaultArgs>;

/**
 * Create Project Locale Request Schema (DEPRECATED)
 *
 * @deprecated Use createProjectLocaleAtomicSchema instead
 * Validates input when adding a new locale to a project via simple POST
 */
export const createProjectLocaleSchema = z.object({
  label: localeLabelSchema,
  locale: localeCodeSchema,
  project_id: z.string().uuid('Invalid project ID format'),
}) satisfies z.ZodType<CreateProjectLocaleRequest>;

/**
 * Create Project Locale Atomic Request Schema
 *
 * Validates input for the atomic locale creation RPC function.
 * Preferred approach with built-in fan-out verification and better error handling.
 */
export const createProjectLocaleAtomicSchema = z.object({
  p_label: localeLabelSchema,
  p_locale: localeCodeSchema,
  p_project_id: z.string().uuid('Invalid project ID format'),
}) satisfies z.ZodType<CreateProjectLocaleAtomicRequest>;

/**
 * Update Project Locale Schema
 *
 * Only allows updating the label field.
 * The locale code is immutable after creation.
 */
export const updateProjectLocaleSchema = z
  .object({
    label: localeLabelSchema.optional(),
    // Prevent immutable field modification
    locale: z.never().optional(),
  })
  .strict() satisfies z.ZodType<UpdateProjectLocaleRequest>;

/**
 * Locale ID Schema
 *
 * Validates locale ID format (UUID)
 */
export const localeIdSchema = z.string().uuid('Invalid locale ID format');

/**
 * Project Locale Response Schema
 *
 * Validates response data from the database
 */
export const projectLocaleResponseSchema = z.object({
  created_at: z.string(),
  id: z.string().uuid(),
  label: z.string(),
  locale: z.string(),
  project_id: z.string().uuid(),
  updated_at: z.string(),
});

/**
 * Project Locale with Default Flag Schema
 *
 * Extends the base response schema with is_default flag
 * Used when fetching locales with default locale indicator
 */
export const projectLocaleWithDefaultSchema = projectLocaleResponseSchema.extend({
  is_default: z.boolean(),
}) satisfies z.ZodType<ProjectLocaleWithDefault>;
