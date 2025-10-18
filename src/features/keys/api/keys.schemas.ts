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

// Full key validation
const fullKeySchema = z
  .string()
  .min(KEY_NAME_MIN_LENGTH, KEYS_ERROR_MESSAGES.KEY_REQUIRED)
  .max(KEY_NAME_MAX_LENGTH, KEYS_ERROR_MESSAGES.KEY_TOO_LONG)
  .regex(KEY_FORMAT_PATTERN, KEYS_ERROR_MESSAGES.KEY_INVALID_FORMAT)
  .refine((val) => !val.includes('..'), KEYS_ERROR_MESSAGES.KEY_CONSECUTIVE_DOTS)
  .refine((val) => !val.endsWith('.'), KEYS_ERROR_MESSAGES.KEY_TRAILING_DOT);

// Translation value validation
const translationValueSchema = z
  .string()
  .min(TRANSLATION_VALUE_MIN_LENGTH, KEYS_ERROR_MESSAGES.VALUE_REQUIRED)
  .max(TRANSLATION_VALUE_MAX_LENGTH, KEYS_ERROR_MESSAGES.VALUE_TOO_LONG)
  .refine((val) => !val.includes('\n'), KEYS_ERROR_MESSAGES.VALUE_NO_NEWLINES)
  .transform((val) => val.trim());

// Locale code validation (BCP-47 format)
const localeCodeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// Project ID validation
export const projectIdSchema = z.string().uuid('Invalid project ID format');

// List Keys Default View Schema
export const listKeysDefaultViewSchema = z.object({
  limit: z.number().int().min(1).max(KEYS_MAX_LIMIT).optional().default(KEYS_DEFAULT_LIMIT),
  missing_only: z.boolean().optional().default(KEYS_DEFAULT_PARAMS.MISSING_ONLY),
  offset: z.number().int().min(KEYS_MIN_OFFSET).optional().default(KEYS_DEFAULT_PARAMS.OFFSET),
  project_id: projectIdSchema,
  search: z.string().optional(),
});

// List Keys Per-Language View Schema
export const listKeysPerLanguageViewSchema = listKeysDefaultViewSchema.extend({
  locale: localeCodeSchema,
});

// Create Key Request Schema (API input format without p_ prefix)
export const createKeyRequestSchema = z.object({
  default_value: translationValueSchema,
  full_key: fullKeySchema,
  project_id: projectIdSchema,
});

// Create Key Schema with RPC parameter transformation (adds p_ prefix)
export const createKeySchema = createKeyRequestSchema.transform((data) => ({
  p_default_value: data.default_value,
  p_full_key: data.full_key,
  p_project_id: data.project_id,
}));

// Delete Key Schema
export const deleteKeySchema = z.object({
  id: projectIdSchema,
});

// Response Schemas for runtime validation
export const keyDefaultViewResponseSchema = z.object({
  created_at: z.string(),
  full_key: z.string(),
  id: z.string().uuid(),
  missing_count: z.number().int().min(0),
  value: z.string(),
});

export const keyPerLanguageViewResponseSchema = z.object({
  full_key: z.string(),
  is_machine_translated: z.boolean(),
  key_id: z.string().uuid(),
  updated_at: z.string(),
  updated_by_user_id: z.string().uuid().nullable(),
  updated_source: z.enum(['user', 'system']),
  value: z.string().nullable(),
});

export const createKeyResponseSchema = z.object({
  key_id: z.string().uuid(),
});
