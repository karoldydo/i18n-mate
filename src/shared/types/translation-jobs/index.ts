import type { Enums, Tables } from '../database.types';
import type { PaginatedResponse, PaginationParams } from '../types';

export interface CancelTranslationJobContext {
  previousJob?: TranslationJobResponse;
}

export interface CancelTranslationJobRequest {
  jobId: string;
}
export type CancelTranslationJobResponse = TranslationJobResponse;

export interface CancelTranslationJobRpcArgs {
  job_id: string;
  status: 'cancelled';
}

export interface CreateTranslationJobRequest {
  key_ids: string[];
  mode: TranslationMode;
  params?: null | TranslationJobParams;
  project_id: string;
  target_locale: string;
}

export interface CreateTranslationJobResponse {
  job_id: string;
  message: string;
  status: JobStatus;
}

export interface GetJobItemsParams {
  job_id: string;
  limit?: number;
  offset?: number;
  status?: ItemStatus;
}
export type ItemStatus = Enums<'item_status'>;

export type JobStatus = Enums<'job_status'>;

export interface ListTranslationJobsParams extends PaginationParams {
  project_id: string;
  status?: JobStatus | JobStatus[];
}

export type TranslationJobItemResponse = Tables<'translation_job_items'> & {
  keys: {
    full_key: string;
  };
};
export type TranslationJobItemsRequest = GetJobItemsParams;

export type TranslationJobItemsResponse = PaginatedResponse<TranslationJobItemResponse>;

export interface TranslationJobParams {
  max_tokens?: number;
  model?: string;
  provider?: string;
  temperature?: number;
}

export type TranslationJobRequest = string; // project_id for active job check

export type TranslationJobResponse = Tables<'translation_jobs'>;

export type TranslationJobsRequest = ListTranslationJobsParams;

export type TranslationJobsResponse = PaginatedResponse<TranslationJobResponse>;

export type TranslationMode = Enums<'translation_mode'>;

export function isActiveJob(job: Tables<'translation_jobs'>): boolean {
  return job.status === 'pending' || job.status === 'running';
}

export function isFinishedJob(job: Tables<'translation_jobs'>): boolean {
  return job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled';
}
