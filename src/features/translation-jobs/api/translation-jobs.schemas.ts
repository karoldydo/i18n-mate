import { z } from 'zod';

import type {
  CancelTranslationJobRpcArgs,
  CreateTranslationJobRequest,
  CreateTranslationJobResponse,
  GetJobItemsParams,
  ItemStatus,
  JobStatus,
  ListTranslationJobsParams,
  TranslationJobItemResponse,
  TranslationJobParams,
  TranslationJobResponse,
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

// job id validation schema
// validates uuid format for translation job identifiers
export const JOB_ID_SCHEMA = z
  .string()
  .uuid(TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_JOB_ID)
  .brand<'TranslationJobId'>();

// project id validation schema
// validates uuid format for project identifiers
export const PROJECT_ID_SCHEMA = z
  .string()
  .uuid(TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_PROJECT_ID)
  .brand<'ProjectId'>();

// key ids validation schema
// validates array of uuid strings for translation key identifiers
export const KEY_IDS_SCHEMA = z.array(
  z.string().uuid(TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_KEY_ID)
) satisfies z.ZodType<CreateTranslationJobRequest['key_ids']>;

// locale code validation schema (bcp-47 format)
// validates normalized locale codes such as en or en-us
const LOCALE_CODE_SCHEMA = z
  .string()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_TARGET_LOCALE,
  })
  .brand<'LocaleCode'>();

// translation mode validation schema
// validates job execution modes: all keys, selected keys, or single key
const TRANSLATION_MODE_SCHEMA = z.enum(['all', 'selected', 'single'], {
  errorMap: () => ({ message: TRANSLATION_JOBS_ERROR_MESSAGES.INVALID_MODE }),
}) satisfies z.ZodType<TranslationMode>;

// job status validation schema
// validates translation job lifecycle states
const JOB_STATUS_SCHEMA = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]) satisfies z.ZodType<JobStatus>;

// item status validation schema
// validates individual translation item states within a job
const ITEM_STATUS_SCHEMA = z.enum(['pending', 'completed', 'failed', 'skipped']) satisfies z.ZodType<ItemStatus>;

// llm parameters validation schema
// validates optional configuration for language model translation requests
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

// check active job schema
// validates parameters for checking if a project has an active translation job
export const CHECK_ACTIVE_JOB_SCHEMA = z.object({
  project_id: PROJECT_ID_SCHEMA,
}) satisfies z.ZodType<Pick<CreateTranslationJobRequest, 'project_id'>>;

// list translation jobs schema
// validates parameters for fetching paginated job history with filtering and sorting
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
}) satisfies z.ZodType<ListTranslationJobsParams>;

// create translation job schema
// validates job creation requests with comprehensive mode-specific validation
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

// cancel translation job schema
// validates job cancellation requests - only allows setting status to cancelled
export const CANCEL_TRANSLATION_JOB_SCHEMA = z.object({
  job_id: JOB_ID_SCHEMA,
  status: z.literal('cancelled'),
}) satisfies z.ZodType<CancelTranslationJobRpcArgs>;

// get job items schema
// validates parameters for fetching detailed item-level status within a translation job
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
}) satisfies z.ZodType<GetJobItemsParams>;

// response schemas for runtime validation
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

export const CREATE_TRANSLATION_JOB_RESPONSE_SCHEMA = z.object({
  job_id: z.string().uuid(),
  message: z.string(),
  status: JOB_STATUS_SCHEMA,
}) satisfies z.ZodType<CreateTranslationJobResponse>;
