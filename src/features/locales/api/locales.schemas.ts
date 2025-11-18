import { z } from 'zod';

import type { CreateLocaleRequest, LocalesResponse, UpdateLocaleRequest } from '@/shared/types';

import { LOCALE_ERROR_MESSAGES, LOCALE_LABEL_MAX_LENGTH, LOCALE_NORMALIZATION } from '@/shared/constants';

// locale code validation (bcp-47 format: ll or ll-cc)
const LOCALE_CODE_SCHEMA = z.string().refine((value) => LOCALE_NORMALIZATION.isValidFormatClient(value), {
  message: LOCALE_ERROR_MESSAGES.INVALID_FORMAT,
});

// locale label validation
const LOCALE_LABEL_SCHEMA = z
  .string()
  .min(1, LOCALE_ERROR_MESSAGES.LABEL_REQUIRED)
  .max(LOCALE_LABEL_MAX_LENGTH, LOCALE_ERROR_MESSAGES.LABEL_TOO_LONG)
  .trim();

/**
 * Zod schema for validating create locale request payloads
 *
 * Validates locale creation requests with BCP-47 format locale codes and
 * human-readable labels. Ensures locale codes match the expected format
 * (language code or language-region) and labels meet length requirements.
 *
 * @type {z.ZodType<CreateLocaleRequest>}
 */
export const CREATE_LOCALE_SCHEMA = z.object({
  label: LOCALE_LABEL_SCHEMA,
  locale: LOCALE_CODE_SCHEMA,
}) satisfies z.ZodType<CreateLocaleRequest>;

/**
 * Zod schema for validating update locale request payloads
 *
 * Validates locale update requests. Only the label field can be updated;
 * locale codes are immutable after creation. Uses strict mode to prevent
 * additional fields from being included.
 *
 * @type {z.ZodType<UpdateLocaleRequest>}
 */
export const UPDATE_LOCALE_SCHEMA = z
  .object({
    label: LOCALE_LABEL_SCHEMA.optional(),
  })
  .strict() satisfies z.ZodType<UpdateLocaleRequest>;

/**
 * Zod schema for validating UUID format strings
 *
 * Validates that a string matches the UUID v4 format pattern.
 *
 * @type {z.ZodString}
 */
export const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

/**
 * Zod schema for validating a single locale response from the database
 *
 * Validates the structure of a locale object returned from database queries,
 * including all required fields: id, project_id, locale code, label, and timestamps.
 *
 * @type {z.ZodObject}
 */
export const LOCALE_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  id: z.string().uuid(),
  label: z.string(),
  locale: z.string(),
  project_id: z.string().uuid(),
  updated_at: z.string(),
});

/**
 * Zod schema for validating an array of locales with default locale indicator
 *
 * Validates the response from list_project_locales_with_default RPC function,
 * which returns an array of locales with an additional is_default boolean flag
 * indicating which locale is the project's default language.
 *
 * @type {z.ZodType<LocalesResponse>}
 */
export const LOCALES_RESPONSE_SCHEMA = z.array(
  LOCALE_RESPONSE_SCHEMA.extend({
    is_default: z.boolean(),
  })
) satisfies z.ZodType<LocalesResponse>;
