// Translation Jobs Feature Types

import type { Enums, Tables, TablesInsert, TablesUpdate } from '../database.types';
import type { PaginatedResponse, PaginationParams } from '../types';

// Cancel translation job request
export interface CancelTranslationJobRequest {
  status: 'cancelled';
}

// Raw array from Supabase query (0-1 items, at most one active job per project)
export type CheckActiveJobResponse = TranslationJobResponse[];

// Create translation job request
export interface CreateTranslationJobRequest {
  key_ids: string[];
  mode: TranslationMode;
  params?: null | TranslationJobParams;
  project_id: string;
  target_locale: string;
}

// Edge Function result
export interface CreateTranslationJobResponse {
  job_id: string;
  message: string;
  status: JobStatus;
}

// Parameters for fetching job item details
export interface GetJobItemsParams {
  job_id: string;
  limit?: number;
  offset?: number;
  status?: ItemStatus;
}

export type ItemStatus = Enums<'item_status'>;
export type JobStatus = Enums<'job_status'>;

// Paginated job items with key info
export type ListTranslationJobItemsResponse = PaginatedResponse<TranslationJobItemResponse>;

// Query parameters for listing translation jobs
export interface ListTranslationJobsParams extends PaginationParams {
  project_id: string;
  status?: JobStatus | JobStatus[];
}

// Paginated job history
export type ListTranslationJobsResponse = PaginatedResponse<TranslationJobResponse>;

// Translation Job entity
export type TranslationJob = Tables<'translation_jobs'>;

// Branded type for translation job IDs
export type TranslationJobId = string & { readonly __brand: 'TranslationJobId' };

export type TranslationJobInsert = TablesInsert<'translation_jobs'>;

// Translation Job Item entity
export type TranslationJobItem = Tables<'translation_job_items'>;

// Branded type for translation job item IDs
export type TranslationJobItemId = string & { readonly __brand: 'TranslationJobItemId' };

export type TranslationJobItemInsert = TablesInsert<'translation_job_items'>;

// Job item with embedded key information
export type TranslationJobItemResponse = TranslationJobItem & {
  keys: {
    full_key: string;
  };
};

export type TranslationJobItemUpdate = TablesUpdate<'translation_job_items'>;

// LLM configuration
export interface TranslationJobParams {
  max_tokens?: number;
  model?: string;
  provider?: string;
  temperature?: number;
}

// Standard job representation
export type TranslationJobResponse = TranslationJob;

export type TranslationJobUpdate = TablesUpdate<'translation_jobs'>;

export type TranslationMode = Enums<'translation_mode'>;

// Type guard: check if job is active (pending or running)
export function isActiveJob(job: TranslationJob): boolean {
  return job.status === 'pending' || job.status === 'running';
}

// Type guard: check if job is finished (completed, failed, or cancelled)
export function isFinishedJob(job: TranslationJob): boolean {
  return job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled';
}
