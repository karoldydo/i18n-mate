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

// project id validation
export const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

// list keys default view schema
export const LIST_KEYS_DEFAULT_VIEW_SCHEMA = z.object({
  limit: z.number().int().min(1).max(KEYS_MAX_LIMIT).optional().default(KEYS_DEFAULT_LIMIT),
  missing_only: z.boolean().optional().default(KEYS_DEFAULT_PARAMS.MISSING_ONLY),
  offset: z.number().int().min(KEYS_MIN_OFFSET).optional().default(KEYS_DEFAULT_PARAMS.OFFSET),
  project_id: UUID_SCHEMA,
  search: z.string().optional(),
});

// list keys per-language view schema
export const LIST_KEYS_PER_LANGUAGE_VIEW_SCHEMA = LIST_KEYS_DEFAULT_VIEW_SCHEMA.extend({
  locale: LOCALE_CODE_SCHEMA,
});

// create key request schema (api input format without p_ prefix)
export const CREATE_KEY_REQUEST_SCHEMA = z.object({
  default_value: TRANSLATION_VALUE_SCHEMA,
  full_key: FULL_KEY_SCHEMA,
  project_id: UUID_SCHEMA,
});

// create key schema with rpc parameter transformation (adds p_ prefix)
export const CREATE_KEY_SCHEMA = CREATE_KEY_REQUEST_SCHEMA.transform((data) => ({
  p_default_value: data.default_value,
  p_full_key: data.full_key,
  p_project_id: data.project_id,
}));

// response schemas for runtime validation
export const KEY_DEFAULT_VIEW_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  full_key: z.string(),
  id: z.string().uuid(),
  missing_count: z.number().int().min(0),
  value: z.string(),
});

// key per-language view response schema
export const KEY_PER_LANGUAGE_VIEW_RESPONSE_SCHEMA = z.object({
  full_key: z.string(),
  is_machine_translated: z.boolean(),
  key_id: z.string().uuid(),
  updated_at: z.string(),
  updated_by_user_id: z.string().uuid().nullable(),
  updated_source: z.enum(['user', 'system']),
  value: z.string().nullable(),
});

// create key response schema
export const CREATE_KEY_RESPONSE_SCHEMA = z.object({
  key_id: z.string().uuid(),
});
