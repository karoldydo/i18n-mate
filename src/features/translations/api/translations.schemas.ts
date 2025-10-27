import { z } from 'zod';

import type { TranslationResponse, UpdateTranslationRequest } from '@/shared/types';

import {
  TRANSLATION_VALUE_MAX_LENGTH,
  TRANSLATION_VALUE_MIN_LENGTH,
  TRANSLATIONS_ERROR_MESSAGES,
  TRANSLATIONS_UPDATE_SOURCE_VALUES,
} from '@/shared/constants';

// translation value validation (same as used in keys)
const TRANSLATION_VALUE_SCHEMA = z
  .string()
  .min(TRANSLATION_VALUE_MIN_LENGTH, TRANSLATIONS_ERROR_MESSAGES.VALUE_REQUIRED)
  .max(TRANSLATION_VALUE_MAX_LENGTH, TRANSLATIONS_ERROR_MESSAGES.VALUE_TOO_LONG)
  .refine((value) => !value.includes('\n'), TRANSLATIONS_ERROR_MESSAGES.VALUE_NO_NEWLINES)
  .transform((value) => value.trim());

// locale code validation (bcp-47 format)
const LOCALE_CODE_SCHEMA = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// uuid validation schemas
const PROJECT_ID_SCHEMA = z.string().uuid('Invalid project ID format');
const KEY_ID_SCHEMA = z.string().uuid('Invalid key ID format');
const USER_ID_SCHEMA = z.string().uuid('Invalid user ID format');

// update source validation
const UPDATE_SOURCE_SCHEMA = z.enum(TRANSLATIONS_UPDATE_SOURCE_VALUES, {
  errorMap: () => ({ message: 'Update source must be "user" or "system"' }),
});

// update translation request body schema (only the body fields, not URL params)
export const UPDATE_TRANSLATION_REQUEST_BODY_SCHEMA = z.object({
  is_machine_translated: z.boolean(),
  updated_by_user_id: USER_ID_SCHEMA.nullable(),
  updated_source: UPDATE_SOURCE_SCHEMA,
  value: TRANSLATION_VALUE_SCHEMA,
});

// full update translation request schema (with URL params)
export const UPDATE_TRANSLATION_REQUEST_SCHEMA = z.object({
  is_machine_translated: z.boolean(),
  key_id: KEY_ID_SCHEMA,
  locale: LOCALE_CODE_SCHEMA,
  project_id: PROJECT_ID_SCHEMA,
  updated_at: z.string().datetime().optional(),
  updated_by_user_id: USER_ID_SCHEMA.nullable(),
  updated_source: UPDATE_SOURCE_SCHEMA,
  value: TRANSLATION_VALUE_SCHEMA.nullable(),
}) satisfies z.ZodType<UpdateTranslationRequest>;

// response schemas for runtime validation
export const TRANSLATION_RESPONSE_SCHEMA = z.object({
  is_machine_translated: z.boolean(),
  key_id: KEY_ID_SCHEMA,
  locale: LOCALE_CODE_SCHEMA,
  project_id: PROJECT_ID_SCHEMA,
  updated_at: z.string(),
  updated_by_user_id: USER_ID_SCHEMA.nullable(),
  updated_source: UPDATE_SOURCE_SCHEMA,
  value: z.string().nullable(),
}) satisfies z.ZodType<TranslationResponse>;
