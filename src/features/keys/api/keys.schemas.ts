import { z } from 'zod';

import {
  KEY_FORMAT_PATTERN,
  KEY_NAME_MAX_LENGTH,
  KEY_NAME_MIN_LENGTH,
  KEYS_DEFAULT_LIMIT,
  KEYS_DEFAULT_PARAMS,
  KEYS_ERROR_MESSAGES,
  KEYS_MAX_LIMIT,
  KEYS_MIN_OFFSET,
  TRANSLATION_VALUE_MAX_LENGTH,
  TRANSLATION_VALUE_MIN_LENGTH,
} from '@/shared/constants';
import { LOCALE_CODE_PATTERN } from '@/shared/constants/locales.constants';

// full key validation
const FULL_KEY_SCHEMA = z
  .string()
  .min(KEY_NAME_MIN_LENGTH, KEYS_ERROR_MESSAGES.KEY_REQUIRED)
  .max(KEY_NAME_MAX_LENGTH, KEYS_ERROR_MESSAGES.KEY_TOO_LONG)
  .regex(KEY_FORMAT_PATTERN, KEYS_ERROR_MESSAGES.KEY_INVALID_FORMAT)
  .refine((value) => !value.includes('..'), KEYS_ERROR_MESSAGES.KEY_CONSECUTIVE_DOTS)
  .refine((value) => !value.endsWith('.'), KEYS_ERROR_MESSAGES.KEY_TRAILING_DOT);

// translation value validation
const TRANSLATION_VALUE_SCHEMA = z
  .string()
  .min(TRANSLATION_VALUE_MIN_LENGTH, KEYS_ERROR_MESSAGES.VALUE_REQUIRED)
  .max(TRANSLATION_VALUE_MAX_LENGTH, KEYS_ERROR_MESSAGES.VALUE_TOO_LONG)
  .refine((value) => !value.includes('\n'), KEYS_ERROR_MESSAGES.VALUE_NO_NEWLINES)
  .transform((value) => value.trim());

// locale code validation (bcp-47 format)
const LOCALE_CODE_SCHEMA = z.string().regex(LOCALE_CODE_PATTERN, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

/**
 * Zod schema for validating UUID format
 *
 * Validates that a string is a valid UUID v4 format. Used for project IDs,
 * key IDs, and other database identifiers throughout the application.
 *
 * @returns {z.ZodString} Zod string schema with UUID validation
 */
export const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

/**
 * Zod schema for keys list query parameters (default view)
 *
 * Validates parameters for fetching paginated keys with default locale values
 * and missing translation counts. Used by the default keys view.
 *
 * @returns {z.ZodObject} Zod object schema with pagination, filtering, and project ID
 */
export const KEYS_SCHEMA = z.object({
  limit: z.number().int().min(1).max(KEYS_MAX_LIMIT).optional().default(KEYS_DEFAULT_LIMIT),
  missing_only: z.boolean().optional().default(KEYS_DEFAULT_PARAMS.MISSING_ONLY),
  offset: z.number().int().min(KEYS_MIN_OFFSET).optional().default(KEYS_DEFAULT_PARAMS.OFFSET),
  project_id: UUID_SCHEMA,
  search: z.string().optional(),
});

/**
 * Zod schema for key translations list query parameters (per-language view)
 *
 * Extends KEYS_SCHEMA with a required locale parameter for fetching keys
 * with translation values for a specific language.
 *
 * @returns {z.ZodObject} Zod object schema with locale-specific key listing parameters
 */
export const KEY_TRANSLATIONS_SCHEMA = KEYS_SCHEMA.extend({
  locale: LOCALE_CODE_SCHEMA,
});

/**
 * Zod schema for create key request (API input format)
 *
 * Validates the input format for creating a new translation key with its
 * default value. Does not include the p_ prefix used by RPC functions.
 *
 * @returns {z.ZodObject} Zod object schema for key creation request
 */
export const CREATE_KEY_REQUEST_SCHEMA = z.object({
  default_value: TRANSLATION_VALUE_SCHEMA,
  full_key: FULL_KEY_SCHEMA,
  project_id: UUID_SCHEMA,
});

/**
 * Zod schema for create key RPC call (with p_ prefix transformation)
 *
 * Transforms CREATE_KEY_REQUEST_SCHEMA to match the RPC function parameter
 * format by adding the p_ prefix to all field names.
 *
 * @returns {z.ZodEffects} Zod schema that transforms input to RPC format
 */
export const CREATE_KEY_SCHEMA = CREATE_KEY_REQUEST_SCHEMA.transform((data) => ({
  p_default_value: data.default_value,
  p_full_key: data.full_key,
  p_project_id: data.project_id,
}));

/**
 * Zod schema for key default view response items
 *
 * Validates response items from the default keys view, which includes
 * key metadata, default locale value, and missing translation count.
 *
 * @returns {z.ZodObject} Zod object schema for default view key items
 */
export const KEY_DEFAULT_VIEW_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  full_key: z.string(),
  id: z.string().uuid(),
  missing_count: z.number().int().min(0),
  value: z.string(),
});

/**
 * Zod schema for key per-language view response items
 *
 * Validates response items from the per-language keys view, which includes
 * translation values, metadata, and provenance information for a specific locale.
 *
 * @returns {z.ZodObject} Zod object schema for per-language view key items
 */
export const KEY_PER_LANGUAGE_VIEW_RESPONSE_SCHEMA = z.object({
  full_key: z.string(),
  is_machine_translated: z.boolean(),
  key_id: z.string().uuid(),
  updated_at: z.string(),
  updated_by_user_id: z.string().uuid().nullable(),
  updated_source: z.enum(['user', 'system']),
  value: z.string().nullable(),
});

/**
 * Zod schema for create key response
 *
 * Validates the response from the create key RPC function, which returns
 * the UUID of the newly created key.
 *
 * @returns {z.ZodObject} Zod object schema for key creation response
 */
export const CREATE_KEY_RESPONSE_SCHEMA = z.object({
  key_id: z.string().uuid(),
});
