import { z } from 'zod';

import type {
  CreateProjectLocaleRequest,
  ListProjectLocalesWithDefaultArgs,
  ProjectLocaleWithDefault,
  UpdateProjectLocaleRequest,
} from '@/shared/types';

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

// list project locales with default schema
export const LIST_PROJECT_LOCALES_WITH_DEFAULT_SCHEMA = z.object({
  p_project_id: z.string().uuid('Invalid project ID format'),
}) satisfies z.ZodType<ListProjectLocalesWithDefaultArgs>;

// create project locale atomic request schema
export const CREATE_PROJECT_LOCALE_ATOMIC_SCHEMA = z.object({
  p_label: LOCALE_LABEL_SCHEMA,
  p_locale: LOCALE_CODE_SCHEMA,
  p_project_id: z.string().uuid('Invalid project ID format'),
}) satisfies z.ZodType<CreateProjectLocaleRequest>;

// update project locale schema
export const UPDATE_PROJECT_LOCALE_SCHEMA = z
  .object({
    label: LOCALE_LABEL_SCHEMA.optional(),
    // prevent immutable field modification
    locale: z.never().optional(),
  })
  .strict() satisfies z.ZodType<UpdateProjectLocaleRequest>;

// UUID schema
export const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

// project locale response schema
export const PROJECT_LOCALE_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  id: z.string().uuid(),
  label: z.string(),
  locale: z.string(),
  project_id: z.string().uuid(),
  updated_at: z.string(),
});

// project locale with default flag schema
export const PROJECT_LOCALE_WITH_DEFAULT_SCHEMA = PROJECT_LOCALE_RESPONSE_SCHEMA.extend({
  is_default: z.boolean(),
}) satisfies z.ZodType<ProjectLocaleWithDefault>;
