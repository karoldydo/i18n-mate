import { z } from 'zod';

import {
  TRANSLATION_JOBS_DEFAULT_ITEMS_LIMIT,
  TRANSLATION_JOBS_DEFAULT_LIMIT,
  TRANSLATION_JOBS_ERROR_MESSAGES,
  TRANSLATION_JOBS_MAX_ITEMS_LIMIT,
  TRANSLATION_JOBS_MAX_LIMIT,
  TRANSLATION_JOBS_MIN_LIMIT,
  TRANSLATION_JOBS_MIN_OFFSET,
  TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MAX,
  TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MIN,
  TRANSLATION_JOBS_PARAMS_TEMPERATURE_MAX,
  TRANSLATION_JOBS_PARAMS_TEMPERATURE_MIN,
} from '@/shared/constants';

/**
 * Job ID validation schema
 * Validates UUID format for translation job identifiers
 */
export const jobIdSchema = z.string().uuid(TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_JOB_ID);

/**
 * Project ID validation schema
 * Validates UUID format for project identifiers
 */
export const projectIdSchema = z.string().uuid(TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_PROJECT_ID);

/**
 * Key IDs validation schema
 * Validates array of UUID strings for translation key identifiers
 */
export const keyIdsSchema = z.array(z.string().uuid(TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_KEY_ID));

/**
 * Locale code validation schema (BCP-47 format)
 * Validates normalized locale codes: ll or ll-CC format
 * Examples: "en", "en-US", "pl", "de-DE"
 */
const localeCodeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_TARGET_LOCALE,
});

/**
 * Translation mode validation schema
 * Validates job execution modes: all keys, selected keys, or single key
 */
const translationModeSchema = z.enum(['all', 'selected', 'single'], {
  errorMap: () => ({ message: TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_MODE }),
});

/**
 * Job status validation schema
 * Validates translation job lifecycle states
 */
const jobStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);

/**
 * Item status validation schema
 * Validates individual translation item states within a job
 */
const itemStatusSchema = z.enum(['pending', 'completed', 'failed', 'skipped']);

/**
 * LLM parameters validation schema
 * Validates optional configuration for language model translation requests
 * All parameters have defined min/max constraints from constants
 */
export const translationJobParamsSchema = z
  .object({
    max_tokens: z
      .number()
      .int()
      .min(TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MIN, {
        message: TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_MAX_TOKENS,
      })
      .max(TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MAX, {
        message: TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_MAX_TOKENS,
      })
      .optional(),
    model: z.string().optional(),
    provider: z.string().optional(),
    temperature: z
      .number()
      .min(TRANSLATION_JOBS_PARAMS_TEMPERATURE_MIN, {
        message: TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_TEMPERATURE,
      })
      .max(TRANSLATION_JOBS_PARAMS_TEMPERATURE_MAX, {
        message: TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_TEMPERATURE,
      })
      .optional(),
  })
  .optional()
  .nullable();

/**
 * Check Active Job Schema
 * Validates parameters for checking if a project has an active translation job
 * Used for real-time polling during job execution
 */
export const checkActiveJobSchema = z.object({
  project_id: projectIdSchema,
});

/**
 * List Translation Jobs Schema
 * Validates parameters for fetching paginated job history with filtering and sorting
 * Supports status filtering (single or multiple) and various sort orders
 */
export const listTranslationJobsSchema = z.object({
  limit: z
    .number()
    .int()
    .min(TRANSLATION_JOBS_MIN_LIMIT)
    .max(TRANSLATION_JOBS_MAX_LIMIT)
    .optional()
    .default(TRANSLATION_JOBS_DEFAULT_LIMIT),
  offset: z.number().int().min(TRANSLATION_JOBS_MIN_OFFSET).optional().default(TRANSLATION_JOBS_MIN_OFFSET),
  order: z
    .enum(['created_at.asc', 'created_at.desc', 'status.asc', 'status.desc'])
    .optional()
    .default('created_at.desc'),
  project_id: projectIdSchema,
  status: z.union([jobStatusSchema, z.array(jobStatusSchema)]).optional(),
});

/**
 * Create Translation Job Schema
 * Validates job creation requests with comprehensive mode-specific validation
 *
 * Mode-specific rules:
 * - 'all': key_ids must be empty array
 * - 'selected': key_ids must contain at least one key
 * - 'single': key_ids must contain exactly one key
 */
export const createTranslationJobSchema = z
  .object({
    key_ids: keyIdsSchema,
    mode: translationModeSchema,
    params: translationJobParamsSchema,
    project_id: projectIdSchema,
    target_locale: localeCodeSchema,
  })
  .superRefine((data, ctx) => {
    // Validate key_ids based on mode
    if (data.mode === 'all' && data.key_ids.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: TRANSLATION_JOBS_ERROR_MESSAGES.ALL_MODE_NO_KEYS,
        path: ['key_ids'],
      });
    }

    if (data.mode === 'selected' && data.key_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: TRANSLATION_JOBS_ERROR_MESSAGES.SELECTED_MODE_REQUIRES_KEYS,
        path: ['key_ids'],
      });
    }

    if (data.mode === 'single' && data.key_ids.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: TRANSLATION_JOBS_ERROR_MESSAGES.SINGLE_MODE_ONE_KEY,
        path: ['key_ids'],
      });
    }
  });

/**
 * Cancel Translation Job Schema
 * Validates job cancellation requests - only allows setting status to 'cancelled'
 */
export const cancelTranslationJobSchema = z.object({
  job_id: jobIdSchema,
  status: z.literal('cancelled'),
});

/**
 * Get Job Items Schema
 * Validates parameters for fetching detailed item-level status within a translation job
 * Supports pagination and status filtering for debugging failed translations
 */
export const getJobItemsSchema = z.object({
  job_id: jobIdSchema,
  limit: z
    .number()
    .int()
    .min(TRANSLATION_JOBS_MIN_LIMIT)
    .max(TRANSLATION_JOBS_MAX_ITEMS_LIMIT)
    .optional()
    .default(TRANSLATION_JOBS_DEFAULT_ITEMS_LIMIT),
  offset: z.number().int().min(TRANSLATION_JOBS_MIN_OFFSET).optional().default(TRANSLATION_JOBS_MIN_OFFSET),
  status: itemStatusSchema.optional(),
});

// Response Schemas for runtime validation
export const translationJobResponseSchema = z.object({
  completed_keys: z.number().nullable(),
  created_at: z.string(),
  failed_keys: z.number().nullable(),
  finished_at: z.string().nullable(),
  id: z.string().uuid(),
  mode: translationModeSchema,
  model: z.string().nullable(),
  params: z
    .object({
      max_tokens: z
        .number()
        .int()
        .min(TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MIN)
        .max(TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MAX)
        .optional(),
      model: z.string().optional(),
      provider: z.string().optional(),
      temperature: z
        .number()
        .min(TRANSLATION_JOBS_PARAMS_TEMPERATURE_MIN)
        .max(TRANSLATION_JOBS_PARAMS_TEMPERATURE_MAX)
        .optional(),
    })
    .nullable(),
  project_id: z.string().uuid(),
  provider: z.string().nullable(),
  source_locale: localeCodeSchema,
  started_at: z.string().nullable(),
  status: jobStatusSchema,
  target_locale: localeCodeSchema,
  total_keys: z.number().nullable(),
  updated_at: z.string(),
});

export const translationJobItemResponseSchema = z.object({
  created_at: z.string(),
  error_code: z.string().nullable(),
  error_message: z.string().nullable(),
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  key_id: z.string().uuid(),
  keys: z.object({
    full_key: z.string(),
  }),
  status: itemStatusSchema,
  updated_at: z.string(),
});

export const createTranslationJobResponseSchema = z.object({
  job_id: z.string().uuid(),
  message: z.string(),
  status: jobStatusSchema,
});
