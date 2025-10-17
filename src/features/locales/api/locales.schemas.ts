import { z } from 'zod';

/**
 * Locale code validation (BCP-47 format: ll or ll-CC)
 *
 * Examples:
 * - Valid: "en", "pl", "en-US", "pt-BR"
 * - Invalid: "ENG", "en_US", "english"
 */
const localeCodeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
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
});

/**
 * Create Project Locale Request Schema
 *
 * Validates input when adding a new locale to a project
 */
export const createProjectLocaleSchema = z.object({
  label: localeLabelSchema,
  locale: localeCodeSchema,
  project_id: z.string().uuid('Invalid project ID format'),
});

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
  .strict();

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
});
