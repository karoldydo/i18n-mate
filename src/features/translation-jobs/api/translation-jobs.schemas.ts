import { z } from 'zod';

import type {
  CancelTranslationJobRpcArgs,
  CreateTranslationJobRequest,
  CreateTranslationJobResponse,
  ItemStatus,
  JobStatus,
  TranslationJobItemResponse,
  TranslationJobItemsRequest,
  TranslationJobParams,
  TranslationJobResponse,
  TranslationJobsRequest,
  TranslationMode,
} from '@/shared/types';

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
 *
 * Validates UUID format for translation job identifiers.
 *
 * @type {z.ZodBranded<z.ZodString, 'TranslationJobId'>}
 */
export const JOB_ID_SCHEMA = z
  .string()
  .uuid(TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_JOB_ID)
  .brand<'TranslationJobId'>();

/**
 * Project ID validation schema
 *
 * Validates UUID format for project identifiers.
 *
 * @type {z.ZodBranded<z.ZodString, 'ProjectId'>}
 */
export const PROJECT_ID_SCHEMA = z
  .string()
  .uuid(TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_PROJECT_ID)
  .brand<'ProjectId'>();

/**
 * Key IDs validation schema
 *
 * Validates array of UUID strings for translation key identifiers.
 *
 * @type {z.ZodArray<z.ZodString>}
 */
export const KEY_IDS_SCHEMA = z.array(
  z.string().uuid(TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_KEY_ID)
) satisfies z.ZodType<CreateTranslationJobRequest['key_ids']>;

/**
 * Locale code validation schema (BCP-47 format)
 *
 * Validates normalized locale codes such as en or en-us.
 */
const LOCALE_CODE_SCHEMA = z
  .string()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_TARGET_LOCALE,
  })
  .brand<'LocaleCode'>();

/**
 * Translation mode validation schema
 *
 * Validates job execution modes: all keys, selected keys, or single key.
 */
const TRANSLATION_MODE_SCHEMA = z.enum(['all', 'selected', 'single'], {
  errorMap: () => ({ message: TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_MODE }),
}) satisfies z.ZodType<TranslationMode>;

/**
 * Job status validation schema
 *
 * Validates translation job lifecycle states.
 */
const JOB_STATUS_SCHEMA = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]) satisfies z.ZodType<JobStatus>;

/**
 * Item status validation schema
 *
 * Validates individual translation item states within a job.
 */
const ITEM_STATUS_SCHEMA = z.enum(['pending', 'completed', 'failed', 'skipped']) satisfies z.ZodType<ItemStatus>;

/**
 * LLM parameters validation schema
 *
 * Validates optional configuration for language model translation requests.
 *
 * @type {z.ZodNullable<z.ZodOptional<z.ZodObject<...>>>}
 */
export const TRANSLATION_JOB_PARAMS_SCHEMA = z
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
  .nullable() satisfies z.ZodType<null | TranslationJobParams | undefined>;

/**
 * Check active job schema
 *
 * Validates parameters for checking if a project has an active translation job.
 *
 * @type {z.ZodObject<{project_id: z.ZodBranded<z.ZodString, 'ProjectId'>}>}
 */
export const CHECK_ACTIVE_JOB_SCHEMA = z.object({
  project_id: PROJECT_ID_SCHEMA,
}) satisfies z.ZodType<Pick<CreateTranslationJobRequest, 'project_id'>>;

/**
 * List translation jobs schema
 *
 * Validates parameters for fetching paginated job history with filtering and sorting.
 *
 * @type {z.ZodObject<...>}
 */
export const LIST_TRANSLATION_JOBS_SCHEMA = z.object({
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
  project_id: PROJECT_ID_SCHEMA,
  status: z.union([JOB_STATUS_SCHEMA, z.array(JOB_STATUS_SCHEMA)]).optional(),
}) satisfies z.ZodType<TranslationJobsRequest>;

/**
 * Create translation job schema
 *
 * Validates job creation requests with comprehensive mode-specific validation.
 * Enforces mode-specific key_ids requirements:
 * - 'all' mode: key_ids must be empty
 * - 'selected' mode: key_ids must have at least one key
 * - 'single' mode: key_ids must have exactly one key
 *
 * @type {z.ZodObject<...>}
 */
export const CREATE_TRANSLATION_JOB_SCHEMA = z
  .object({
    key_ids: KEY_IDS_SCHEMA,
    mode: TRANSLATION_MODE_SCHEMA,
    params: TRANSLATION_JOB_PARAMS_SCHEMA,
    project_id: PROJECT_ID_SCHEMA,
    target_locale: LOCALE_CODE_SCHEMA,
  })
  .superRefine((data, ctx) => {
    // validate key_ids based on mode
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
  }) satisfies z.ZodType<CreateTranslationJobRequest>;

/**
 * Cancel translation job schema
 *
 * Validates job cancellation requests - only allows setting status to cancelled.
 *
 * @type {z.ZodObject<{job_id: z.ZodBranded<z.ZodString, 'TranslationJobId'>, status: z.ZodLiteral<'cancelled'>}>}
 */
export const CANCEL_TRANSLATION_JOB_SCHEMA = z.object({
  job_id: JOB_ID_SCHEMA,
  status: z.literal('cancelled'),
}) satisfies z.ZodType<CancelTranslationJobRpcArgs>;

/**
 * Get job items schema
 *
 * Validates parameters for fetching detailed item-level status within a translation job.
 *
 * @type {z.ZodObject<...>}
 */
export const GET_JOB_ITEMS_SCHEMA = z.object({
  job_id: JOB_ID_SCHEMA,
  limit: z
    .number()
    .int()
    .min(TRANSLATION_JOBS_MIN_LIMIT)
    .max(TRANSLATION_JOBS_MAX_ITEMS_LIMIT)
    .optional()
    .default(TRANSLATION_JOBS_DEFAULT_ITEMS_LIMIT),
  offset: z.number().int().min(TRANSLATION_JOBS_MIN_OFFSET).optional().default(TRANSLATION_JOBS_MIN_OFFSET),
  status: ITEM_STATUS_SCHEMA.optional(),
}) satisfies z.ZodType<TranslationJobItemsRequest>;

/**
 * Translation job response schema
 *
 * Validates translation job response data at runtime.
 *
 * @type {z.ZodObject<...>}
 */
export const TRANSLATION_JOB_RESPONSE_SCHEMA = z.object({
  completed_keys: z.number(),
  created_at: z.string(),
  failed_keys: z.number(),
  finished_at: z.string().nullable(),
  id: z.string().uuid(),
  mode: TRANSLATION_MODE_SCHEMA,
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
  source_locale: LOCALE_CODE_SCHEMA,
  started_at: z.string().nullable(),
  status: JOB_STATUS_SCHEMA,
  target_locale: LOCALE_CODE_SCHEMA,
  total_keys: z.number().nullable(),
  updated_at: z.string(),
}) satisfies z.ZodType<TranslationJobResponse>;

/**
 * Translation job item response schema
 *
 * Validates individual translation job item response data at runtime.
 *
 * @type {z.ZodObject<...>}
 */
export const TRANSLATION_JOB_ITEM_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  error_code: z.string().nullable(),
  error_message: z.string().nullable(),
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  key_id: z.string().uuid(),
  keys: z.object({
    full_key: z.string(),
  }),
  status: ITEM_STATUS_SCHEMA,
  updated_at: z.string(),
}) satisfies z.ZodType<TranslationJobItemResponse>;

/**
 * Create translation job response schema
 *
 * Validates create translation job response data at runtime.
 *
 * @type {z.ZodObject<...>}
 */
export const CREATE_TRANSLATION_JOB_RESPONSE_SCHEMA = z.object({
  job_id: z.string().uuid(),
  message: z.string(),
  status: JOB_STATUS_SCHEMA,
}) satisfies z.ZodType<CreateTranslationJobResponse>;
