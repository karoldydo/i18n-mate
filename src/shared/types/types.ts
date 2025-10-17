/**
 * DTO and Command Model Type Definitions for i18n-mate API
 *
 * This file contains all Data Transfer Objects (DTOs) and Command Models
 * used for API communication. All types are derived from database entity
 * types defined in database.types.ts to ensure type safety and consistency.
 */

import type { Enums, Tables, TablesInsert, TablesUpdate } from './database.types';

// ============================================================================
// Base Entity Types
// ============================================================================

/**
 * API Error Response - generic error container
 * Format: { data: null, error: { code, message, details? } }
 */
export interface ApiErrorResponse {
  data: null;
  error: {
    code: number;
    details?: Record<string, unknown>;
    message: string;
  };
}

/**
 * API Success Response - generic success container
 * Format: { data: T, error: null }
 */
export interface ApiResponse<T> {
  data: T;
  error: null;
}

/**
 * Result Type - union of success and error responses
 */
export type ApiResult<T> = ApiErrorResponse | ApiResponse<T>;
/**
 * Bulk Update Translations Request - used internally by translation jobs
 */
export type BulkUpdateTranslationRequest = UpdateTranslationRequest;
/**
 * Cancel Translation Job Request - PATCH /rest/v1/translation_jobs
 */
export interface CancelTranslationJobRequest {
  status: 'cancelled';
}

/**
 * Conflict Error Response - used for optimistic locking and unique constraints
 * Format: { data: null, error: { code: 409, message } }
 */
export interface ConflictErrorResponse extends ApiErrorResponse {
  error: {
    code: 409;
    message: string;
  };
}
/**
 * Create Key with Value Request - POST /rest/v1/rpc/create_key_with_value
 */
// UI-level request (without RPC parameter prefixes)
export interface CreateKeyRequest {
  default_value: string;
  full_key: string;
  project_id: string;
}
/**
 * Create Key Response - RPC function result
 */
export interface CreateKeyResponse {
  key_id: string;
}

// RPC args for create_key_with_value (with p_ prefixes)
export interface CreateKeyRpcArgs {
  p_default_value: string;
  p_full_key: string;
  p_project_id: string;
}
/**
 * Create Project Locale Request - POST /rest/v1/project_locales
 */
export type CreateProjectLocaleRequest = Pick<ProjectLocaleInsert, 'label' | 'locale' | 'project_id'>;

/**
 * Create Project Request - POST /rest/v1/projects or RPC create_project_with_default_locale
 */
export interface CreateProjectRequest {
  default_locale: string;
  description?: null | string;
  name: string;
  prefix: string;
}
/**
 * Create Project with Default Locale Request - RPC function
 */
export interface CreateProjectWithDefaultLocaleRequest extends CreateProjectRequest {
  default_locale_label: string;
}
/**
 * Create Telemetry Event Request - POST /rest/v1/telemetry_events
 */
export type CreateTelemetryEventRequest = Pick<TelemetryEventInsert, 'event_name' | 'project_id' | 'properties'>;

/**
 * Create Translation Job Request - POST /functions/v1/translate
 */
export interface CreateTranslationJobRequest {
  key_ids: string[];
  mode: TranslationMode;
  params?: null | TranslationJobParams;
  project_id: string;
  target_locale: string;
}
/**
 * Create Translation Job Response - Edge Function result
 */
export interface CreateTranslationJobResponse {
  job_id: string;
  message: string;
  status: JobStatus;
}
export type EventType = Enums<'event_type'>;

/**
 * Exported Translations - flat JSON object with dotted keys
 * Format: { "app.home.title": "Welcome Home", ... }
 */
export type ExportedTranslations = Record<string, string>;
/**
 * Export Translations Response - contains multiple locale files
 */
export type ExportTranslationsData = Record<string, ExportedTranslations>;
export type ItemStatus = Enums<'item_status'>;

// ============================================================================
// Enum Types
// ============================================================================

export type JobStatus = Enums<'job_status'>;
/**
 * Key entity - represents a translation key
 */
export type Key = Tables<'keys'>;
export interface KeyCreatedProperties {
  full_key: string;
  key_count: number;
}
/**
 * Key Per Language View - key with translation metadata for specific locale
 * Used by list_keys_per_language_view RPC function
 */
// Wrapper responses used by hooks (client-level API)
export interface KeyDefaultViewListResponse {
  data: KeyDefaultViewResponse[];
  metadata: PaginationMetadata;
}

// Response DTOs for RPC functions (matching implementation plan)
export interface KeyDefaultViewResponse {
  created_at: string;
  full_key: string;
  id: string;
  missing_count: number;
  value: string;
}

export type KeyInsert = TablesInsert<'keys'>;

export interface KeyPerLanguageView {
  full_key: string;
  is_machine_translated: boolean;
  key_id: string;
  updated_at: string;
  updated_by_user_id: null | string;
  updated_source: UpdateSourceType;
  value: null | string;
}

export interface KeyPerLanguageViewListResponse {
  data: KeyPerLanguageView[];
  metadata: PaginationMetadata;
}

// ============================================================================
// Authentication DTOs (Section 2 of API Plan)
// ============================================================================

export interface KeyPerLanguageViewResponse {
  full_key: string;
  is_machine_translated: boolean;
  key_id: string;
  updated_at: string;
  updated_by_user_id: null | string;
  updated_source: UpdateSourceType;
  value: null | string;
}

/**
 * Key Response - standard key representation
 */
export type KeyResponse = Key;

export type KeyUpdate = TablesUpdate<'keys'>;

export interface LanguageAddedProperties {
  locale: string;
  locale_count: number;
}

export interface ListKeysDefaultViewArgs {
  limit?: null | number;
  missing_only?: boolean | null;
  offset?: null | number;
  project_id: string;
  search?: null | string;
}

/**
 * List Keys Query Parameters - used by keys list views
 */
export interface ListKeysDefaultViewParams extends PaginationParams {
  missing_only?: boolean;
  project_id: string;
  search?: string;
}

export interface ListKeysDefaultViewRpcArgs {
  p_limit?: number;
  p_missing_only?: boolean;
  p_offset?: number;
  p_project_id: string;
  p_search?: string;
}

/**
 * List Keys Per Language Query Parameters
 */
export interface ListKeysPerLanguageParams extends ListKeysDefaultViewParams {
  locale: string;
}

export interface ListKeysPerLanguageViewArgs {
  limit?: null | number;
  locale: string;
  missing_only?: boolean | null;
  offset?: null | number;
  project_id: string;
  search?: null | string;
}

export interface ListKeysPerLanguageViewRpcArgs {
  p_limit?: number;
  p_locale: string;
  p_missing_only?: boolean;
  p_offset?: number;
  p_project_id: string;
  p_search?: string;
}

export interface ListProjectLocalesWithDefaultArgs {
  project_id: string;
}

/**
 * List Projects Query Parameters
 */
export interface ListProjectsParams extends PaginationParams {
  order?: 'created_at.asc' | 'created_at.desc' | 'name.asc' | 'name.desc';
}

/**
 * RPC Function Arguments - typed parameters for database functions
 */
export interface ListProjectsWithCountsArgs {
  limit?: number;
  offset?: number;
}

/**
 * List Translation Jobs Query Parameters
 */
export interface ListTranslationJobsParams extends PaginationParams {
  project_id: string;
  status?: JobStatus | JobStatus[];
}

// ============================================================================
// Projects DTOs (Section 3 of API Plan)
// ============================================================================

/**
 * Pagination Metadata - returned in Content-Range header
 */
export interface PaginationMetadata {
  end: number;
  start: number;
  total: number;
}

/**
 * Pagination Parameters - used across list endpoints
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Request Password Reset - POST /auth/v1/recover
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password Reset Response
 */
export interface PasswordResetResponse {
  message: string;
}

/**
 * Project entity - represents a translation project
 */
export type Project = Tables<'projects'>;

// ============================================================================
// Project Locales DTOs (Section 4 of API Plan)
// ============================================================================

export interface ProjectCreatedProperties {
  locale_count: number;
}

export type ProjectInsert = TablesInsert<'projects'>;

/**
 * Project List Response - list of projects with pagination metadata
 * Returned by useProjects hook
 */
export interface ProjectListResponse {
  data: ProjectWithCounts[];
  metadata: PaginationMetadata;
}

/**
 * Project Locale entity - represents a language assigned to a project
 */
export type ProjectLocale = Tables<'project_locales'>;

// ============================================================================
// Keys DTOs (Section 5 of API Plan)
// ============================================================================

export type ProjectLocaleInsert = TablesInsert<'project_locales'>;

/**
 * Project Locale Response - standard locale representation
 */
export type ProjectLocaleResponse = ProjectLocale;

export type ProjectLocaleUpdate = TablesUpdate<'project_locales'>;

/**
 * Project Locale with Default Flag - enhanced locale with is_default flag
 * Used by list_project_locales_with_default RPC function
 */
export type ProjectLocaleWithDefault = ProjectLocaleResponse & {
  is_default: boolean;
};

/**
 * Project Response - standard project representation
 * Based on Projects.Row from database
 */
export type ProjectResponse = Pick<
  Project,
  'created_at' | 'default_locale' | 'description' | 'id' | 'name' | 'prefix' | 'updated_at'
>;

// ============================================================================
// Translations DTOs (Section 6 of API Plan)
// ============================================================================

export type ProjectUpdate = TablesUpdate<'projects'>;

/**
 * Project with Counts - enhanced project with aggregated counts
 * Used by list_projects_with_counts RPC function
 */
export type ProjectWithCounts = ProjectResponse & {
  key_count: number;
  locale_count: number;
};

/**
 * Resend Verification Email Request - POST /auth/v1/resend
 */
export interface ResendVerificationRequest {
  email: string;
  type: 'signup';
}

/**
 * Resend Verification Email Response
 */
export interface ResendVerificationResponse {
  message: string;
}

// ============================================================================
// Translation Jobs DTOs (Section 7 of API Plan)
// ============================================================================

/**
 * Reset Password Request - PUT /auth/v1/user
 */
export interface ResetPasswordRequest {
  password: string;
}

/**
 * Reset Password Response
 */
export interface ResetPasswordResponse {
  user: {
    email: string;
    id: string;
  };
}

/**
 * Sign In Request - POST /auth/v1/token?grant_type=password
 */
export interface SignInRequest {
  email: string;
  password: string;
}

/**
 * Sign In Response - successful login
 */
export interface SignInResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: 'bearer';
  user: {
    email: string;
    email_confirmed_at: string;
    id: string;
  };
}

/**
 * Sign Up Request - POST /auth/v1/signup
 */
export interface SignUpRequest {
  email: string;
  password: string;
}

/**
 * Sign Up Response - successful registration
 */
export interface SignUpResponse {
  session: null;
  user: {
    created_at: string;
    email: string;
    email_confirmed_at: null;
    id: string;
  };
}

// ============================================================================
// Telemetry DTOs (Section 9 of API Plan)
// ============================================================================

/**
 * Telemetry Event entity - represents application telemetry
 */
export type TelemetryEvent = Tables<'telemetry_events'>;

export type TelemetryEventInsert = TablesInsert<'telemetry_events'>;

/**
 * Telemetry Event Properties - typed event-specific data
 */
export type TelemetryEventProperties =
  | KeyCreatedProperties
  | LanguageAddedProperties
  | ProjectCreatedProperties
  | TranslationCompletedProperties;

/**
 * Telemetry Event Response - standard event representation
 */
export type TelemetryEventResponse = TelemetryEvent;

export type TelemetryEventUpdate = TablesUpdate<'telemetry_events'>;

/**
 * Translation entity - represents a translation value for a specific key and locale
 */
export type Translation = Tables<'translations'>;

export interface TranslationCompletedProperties {
  completed_keys: number;
  failed_keys: number;
  mode: TranslationMode;
  target_locale: string;
}

// ============================================================================
// Export DTOs (Section 8 of API Plan)
// ============================================================================

export type TranslationInsert = TablesInsert<'translations'>;

/**
 * Translation Job entity - represents an LLM translation job
 */
export type TranslationJob = Tables<'translation_jobs'>;

// ============================================================================
// Pagination & Query Parameters
// ============================================================================

export type TranslationJobInsert = TablesInsert<'translation_jobs'>;

/**
 * Translation Job Item entity - represents an individual key within a translation job
 */
export type TranslationJobItem = Tables<'translation_job_items'>;

export type TranslationJobItemInsert = TablesInsert<'translation_job_items'>;

/**
 * Translation Job Item Response - job item with embedded key information
 */
export type TranslationJobItemResponse = TranslationJobItem & {
  keys: {
    full_key: string;
  };
};

export type TranslationJobItemUpdate = TablesUpdate<'translation_job_items'>;

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Translation Job Parameters - LLM configuration
 */
export interface TranslationJobParams {
  max_tokens?: number;
  model?: string;
  provider?: string;
  temperature?: number;
}

/**
 * Translation Job Response - standard job representation
 */
export type TranslationJobResponse = TranslationJob;

export type TranslationJobUpdate = TablesUpdate<'translation_jobs'>;

// ============================================================================
// Helper Types
// ============================================================================

export type TranslationMode = Enums<'translation_mode'>;

/**
 * Translation Response - standard translation representation
 */
export type TranslationResponse = Translation;

export type TranslationUpdate = TablesUpdate<'translations'>;

/**
 * Update Project Locale Request - PATCH /rest/v1/project_locales?id=eq.{locale_id}
 * Only label is mutable
 */
export type UpdateProjectLocaleRequest = Pick<ProjectLocaleUpdate, 'label'>;

// ============================================================================
// RPC Function Types
// ============================================================================

/**
 * Update Project Request - PATCH /rest/v1/projects?id=eq.{project_id}
 * Only name and description are mutable
 */
export type UpdateProjectRequest = Pick<ProjectUpdate, 'description' | 'name'>;

export type UpdateSourceType = Enums<'update_source_type'>;

/**
 * Update Translation Request - PATCH /rest/v1/translations
 */
export type UpdateTranslationRequest = Pick<
  TranslationUpdate,
  'is_machine_translated' | 'updated_by_user_id' | 'updated_source' | 'value'
>;

/**
 * Validation Error Response - field-specific validation errors
 */
/**
 * Validation Error Response - used for input validation failures
 * Format: { data: null, error: { code: 400, message, details: { field, constraint } } }
 */
export interface ValidationErrorResponse extends ApiErrorResponse {
  error: {
    code: 400;
    details: {
      constraint: string;
      field: string;
    };
    message: string;
  };
}

/**
 * Verify Email Response - GET /auth/v1/verify
 */
export interface VerifyEmailResponse {
  user: {
    email: string;
    email_confirmed_at: string;
    id: string;
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if job is active (pending or running)
 */
export function isActiveJob(job: TranslationJob): boolean {
  return job.status === 'pending' || job.status === 'running';
}

/**
 * Type guard to check if response is an error
 */
export function isApiErrorResponse<T>(result: ApiResult<T>): result is ApiErrorResponse {
  return result.error !== null;
}

/**
 * Type guard to check if response is successful
 */
export function isApiSuccessResponse<T>(result: ApiResult<T>): result is ApiResponse<T> {
  return result.data !== null;
}

/**
 * Type guard to check if job is finished (completed, failed, or cancelled)
 */
export function isFinishedJob(job: TranslationJob): boolean {
  return job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled';
}
