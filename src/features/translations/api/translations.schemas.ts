import { z } from 'zod';

import {
  TRANSLATION_VALUE_MAX_LENGTH,
  TRANSLATION_VALUE_MIN_LENGTH,
  TRANSLATIONS_ERROR_MESSAGES,
  TRANSLATIONS_UPDATE_SOURCE_VALUES,
} from '@/shared/constants';

// Translation value validation (same as used in keys)
const translationValueSchema = z
  .string()
  .min(TRANSLATION_VALUE_MIN_LENGTH, TRANSLATIONS_ERROR_MESSAGES.VALUE_REQUIRED)
  .max(TRANSLATION_VALUE_MAX_LENGTH, TRANSLATIONS_ERROR_MESSAGES.VALUE_TOO_LONG)
  .refine((val) => !val.includes('\n'), TRANSLATIONS_ERROR_MESSAGES.VALUE_NO_NEWLINES)
  .transform((val) => val.trim());

// Locale code validation (BCP-47 format)
const localeCodeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// UUID validation schemas
const projectIdSchema = z.string().uuid('Invalid project ID format');
const keyIdSchema = z.string().uuid('Invalid key ID format');
const userIdSchema = z.string().uuid('Invalid user ID format');

// Update source validation
const updateSourceSchema = z.enum(TRANSLATIONS_UPDATE_SOURCE_VALUES, {
  errorMap: () => ({ message: 'Update source must be "user" or "system"' }),
});

// Get Translation Query Schema
export const getTranslationQuerySchema = z.object({
  key_id: keyIdSchema,
  locale: localeCodeSchema,
  project_id: projectIdSchema,
});

// Update Translation Request Schema
export const updateTranslationRequestSchema = z.object({
  is_machine_translated: z.boolean(),
  updated_by_user_id: userIdSchema.nullable(),
  updated_source: updateSourceSchema,
  value: translationValueSchema,
});

// Update Translation Query Schema (with optimistic locking)
export const updateTranslationQuerySchema = getTranslationQuerySchema.extend({
  updated_at: z.string().datetime().optional(), // ISO 8601 timestamp for optimistic locking
});

// Bulk Update Query Schema
export const bulkUpdateTranslationQuerySchema = z.object({
  key_ids: z.array(keyIdSchema).min(1, 'At least one key ID is required'),
  locale: localeCodeSchema,
  project_id: projectIdSchema,
});

// Response Schemas for runtime validation
export const translationResponseSchema = z.object({
  is_machine_translated: z.boolean(),
  key_id: keyIdSchema,
  locale: localeCodeSchema,
  project_id: projectIdSchema,
  updated_at: z.string(),
  updated_by_user_id: userIdSchema.nullable(),
  updated_source: updateSourceSchema,
  value: z.string().nullable(),
});
