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

// create locale request schema
export const CREATE_LOCALE_SCHEMA = z.object({
  label: LOCALE_LABEL_SCHEMA,
  locale: LOCALE_CODE_SCHEMA,
}) satisfies z.ZodType<CreateLocaleRequest>;

// update locale schema
export const UPDATE_LOCALE_SCHEMA = z
  .object({
    label: LOCALE_LABEL_SCHEMA.optional(),
  })
  .strict() satisfies z.ZodType<UpdateLocaleRequest>;

// UUID schema
export const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

// locale response schema
export const LOCALE_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  id: z.string().uuid(),
  label: z.string(),
  locale: z.string(),
  project_id: z.string().uuid(),
  updated_at: z.string(),
});

// locales response schema (with is_default flag)
export const LOCALES_RESPONSE_SCHEMA = z.array(
  LOCALE_RESPONSE_SCHEMA.extend({
    is_default: z.boolean(),
  })
) satisfies z.ZodType<LocalesResponse>;
