/**
 * DTO and Command Model Type Definitions for i18n-mate API
 *
 * This file contains all Data Transfer Objects (DTOs) and Command Models
 * used for API communication. All types are derived from database entity
 * types defined in database.types.ts to ensure type safety and consistency.
 */

import type { Database, Enums, Tables, TablesInsert, TablesUpdate } from './database.types';

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
 * Cancel Translation Job Request - PATCH /rest/v1/translation_jobs
 */
export interface CancelTranslationJobRequest {
  status: 'cancelled';
}
/**
 * Check Active Job Response - returns raw array from Supabase query
 * Format: TranslationJobResponse[] (empty array if no active job)
 * Note: array contains 0-1 items (at most one active job per project)
 * Hook useActiveTranslationJob returns this array directly without pagination wrapper
 */
export type CheckActiveJobResponse = TranslationJobResponse[];

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
 * Uses database generated type for consistency
 */
export type CreateKeyResponse = Database['public']['Functions']['create_key_with_value']['Returns'][0];

// RPC args for create_key_with_value (with p_ prefixes)
export interface CreateKeyRpcArgs {
  p_default_value: string;
  p_full_key: string;
  p_project_id: string;
}
/**
 * Create Project Locale Atomic Request - POST /rest/v1/rpc/create_project_locale_atomic
 * Recommended approach with built-in fan-out verification and better error handling
 */
export interface CreateProjectLocaleAtomicRequest {
  p_label: string;
  p_locale: string;
  p_project_id: string;
}

/**
 * Create Project Locale Atomic Response - RPC function result
 * Uses database generated type for consistency
 */
export type CreateProjectLocaleAtomicResponse =
  Database['public']['Functions']['create_project_locale_atomic']['Returns'][0];

/**
 * Create Project Locale Request - POST /rest/v1/project_locales
 *
 * ⚠️ **DEPRECATED** - Use `CreateProjectLocaleAtomicRequest` instead
 *
 * This type is maintained for backward compatibility only.
 * The atomic approach provides:
 * - Built-in fan-out verification
 * - Better error handling and reporting
 * - Atomic operation (all-or-nothing)
 * - Automatic telemetry event emission
 *
 * **Migration guide:**
 * - Replace `CreateProjectLocaleRequest` with `CreateProjectLocaleAtomicRequest`
 * - Update API calls from `POST /rest/v1/project_locales` to `POST /rest/v1/rpc/create_project_locale_atomic`
 * - Use RPC parameter format: `p_label`, `p_locale`, `p_project_id`
 *
 * @deprecated Use CreateProjectLocaleAtomicRequest instead - will be removed in v1.0
 */
export type CreateProjectLocaleRequest = Pick<ProjectLocaleInsert, 'label' | 'locale' | 'project_id'>;

export type CreateProjectRpcArgs = Database['public']['Functions']['create_project_with_default_locale']['Args'];

/**
 * Create Project with Default Locale Request - RPC create_project_with_default_locale
 *
 * This is the primary and recommended interface for creating projects.
 * Uses the atomic RPC approach that creates both project and default locale
 * in a single transaction with proper validation and telemetry.
 */
export interface CreateProjectWithDefaultLocaleRequest {
  default_locale: string;
  default_locale_label: string;
  description?: null | string;
  name: string;
  prefix: string;
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
/**
 * Delete Key RPC Arguments - for DELETE /rest/v1/keys
 * Note: Delete uses direct table filter, not RPC, but included for completeness
 */
export interface DeleteKeyArgs {
  id: string; // key UUID as filter parameter
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

// ============================================================================
// Enum Types
// ============================================================================

/**
 * Get Job Items Parameters - for fetching job item details
 * Note: Uses snake_case to match database column names and API convention
 */
export interface GetJobItemsParams {
  job_id: string;
  limit?: number;
  offset?: number;
  status?: ItemStatus;
}
export type ItemStatus = Enums<'item_status'>;
export type JobStatus = Enums<'job_status'>;
/**
 * Key entity - represents a translation key
 */
export type Key = Tables<'keys'>;

/**
 * Key Created Telemetry Event
 * Emitted when a new translation key is added to a project
 */
export interface KeyCreatedEvent {
  created_at: string;
  event_name: 'key_created';
  project_id: string;
  properties: KeyCreatedProperties;
}

export interface KeyCreatedProperties {
  full_key: string;
  key_count: number;
}

/**
 * Key Per Language View - key with translation metadata for specific locale
 * Used by list_keys_per_language_view RPC function
 */
// Wrapper responses used by hooks (client-level API)
export type KeyDefaultViewListResponse = PaginatedResponse<KeyDefaultViewResponse>;

// Response DTOs for RPC functions (using database generated types)
export type KeyDefaultViewResponse = Database['public']['Functions']['list_keys_default_view']['Returns'][0];

// ============================================================================
// Authentication DTOs (Section 2 of API Plan)
// ============================================================================

/**
 * Branded type for key IDs to ensure type safety
 * Represents a UUID string specifically for translation keys
 */
export type KeyId = string & { readonly __brand: 'KeyId' };

export type KeyInsert = TablesInsert<'keys'>;

export type KeyPerLanguageViewListResponse = PaginatedResponse<KeyPerLanguageViewResponse>;

/**
 * Key Per Language View Response - uses database generated composite type
 * This ensures type safety with actual database schema
 */
export type KeyPerLanguageViewResponse = Database['public']['CompositeTypes']['key_per_language_view_type'];

/**
 * Key Response - standard key representation
 */
export type KeyResponse = Key;

export type KeyUpdate = TablesUpdate<'keys'>;

/**
 * Language Added Telemetry Event
 * Emitted when a new locale is added to a project
 */
export interface LanguageAddedEvent {
  created_at: string;
  event_name: 'language_added';
  project_id: string;
  properties: LanguageAddedProperties;
}

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
  p_project_id: string;
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
 * List Telemetry Events Query Parameters
 */
export interface ListTelemetryEventsParams extends PaginationParams {
  order?: 'created_at.asc' | 'created_at.desc';
  project_id: string;
}

/**
 * List Translation Job Items Response - paginated job items with key info
 * Format: { data: TranslationJobItemResponse[], metadata: PaginationMetadata }
 */
export type ListTranslationJobItemsResponse = PaginatedResponse<TranslationJobItemResponse>;

/**
 * List Translation Jobs Query Parameters
 */
export interface ListTranslationJobsParams extends PaginationParams {
  project_id: string;
  status?: JobStatus | JobStatus[];
}

/**
 * List Translation Jobs Response - paginated job history
 * Format: { data: TranslationJobResponse[], metadata: PaginationMetadata }
 */
export type ListTranslationJobsResponse = PaginatedResponse<TranslationJobResponse>;

/**
 * Branded type for locale codes to ensure type safety
 * Represents a normalized BCP-47 locale code (ll or ll-CC format)
 */
export type LocaleCode = string & { readonly __brand: 'LocaleCode' };

/**
 * Generic Paginated Response - standardized pagination format
 * Used across all paginated endpoints for consistency
 */
export interface PaginatedResponse<T> {
  data: T[];
  metadata: PaginationMetadata;
}

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

// ============================================================================
// Projects DTOs (Section 3 of API Plan)
// ============================================================================

/**
 * Project entity - represents a translation project
 */
export type Project = Tables<'projects'>;

/**
 * Project Created Telemetry Event
 * Emitted when a new project is created (always includes default locale)
 */
export interface ProjectCreatedEvent {
  created_at: string;
  event_name: 'project_created';
  project_id: string;
  properties: ProjectCreatedProperties;
}

export interface ProjectCreatedProperties {
  locale_count: number;
}

/**
 * Branded type for project IDs to ensure type safety
 * Represents a UUID string specifically for projects
 */
export type ProjectId = string & { readonly __brand: 'ProjectId' };

export type ProjectInsert = TablesInsert<'projects'>;

// ============================================================================
// Project Locales DTOs (Section 4 of API Plan)
// ============================================================================

/**
 * Project List Response - list of projects with pagination metadata
 * Returned by useProjects hook
 */
export type ProjectListResponse = PaginatedResponse<ProjectWithCounts>;

/**
 * Project Locale entity - represents a language assigned to a project
 */
export type ProjectLocale = Tables<'project_locales'>;

export type ProjectLocaleInsert = TablesInsert<'project_locales'>;

/**
 * Project Locale Response - standard locale representation
 */
export type ProjectLocaleResponse = ProjectLocale;

// ============================================================================
// Keys DTOs (Section 5 of API Plan)
// ============================================================================

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

export type ProjectUpdate = TablesUpdate<'projects'>;

/**
 * Project with Counts - enhanced project with aggregated counts
 * Used by list_projects_with_counts RPC function
 */
export type ProjectWithCounts = ProjectResponse & {
  key_count: number;
  locale_count: number;
};

// ============================================================================
// Translations DTOs (Section 6 of API Plan)
// ============================================================================

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

// ============================================================================
// Translation Jobs DTOs (Section 7 of API Plan)
// ============================================================================

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

/**
 * Telemetry Event entity - represents application telemetry
 */
export type TelemetryEvent = Tables<'telemetry_events'>;

export type TelemetryEventInsert = TablesInsert<'telemetry_events'>;

// ============================================================================
// Telemetry DTOs (Section 9 of API Plan)
// ============================================================================

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

export interface TelemetryEventsParams {
  limit?: number;
  offset?: number;
  order?: 'created_at.asc' | 'created_at.desc';
}

/**
 * Union type for all telemetry events
 * Used for type-safe event handling and analytics
 */
export type TelemetryEventUnion =
  | KeyCreatedEvent
  | LanguageAddedEvent
  | ProjectCreatedEvent
  | TranslationCompletedEvent;

export type TelemetryEventUpdate = TablesUpdate<'telemetry_events'>;

/**
 * Translation entity - represents a translation value for a specific key and locale
 */
export type Translation = Tables<'translations'>;

/**
 * Translation Completed Telemetry Event
 * Emitted when an LLM translation job is completed
 */
export interface TranslationCompletedEvent {
  created_at: string;
  event_name: 'translation_completed';
  project_id: string;
  properties: TranslationCompletedProperties;
}

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

/**
 * Branded type for translation job IDs to ensure type safety
 * Represents a UUID string specifically for translation jobs
 */
export type TranslationJobId = string & { readonly __brand: 'TranslationJobId' };

export type TranslationJobInsert = TablesInsert<'translation_jobs'>;

/**
 * Translation Job Item entity - represents an individual key within a translation job
 */
export type TranslationJobItem = Tables<'translation_job_items'>;

/**
 * Branded type for translation job item IDs to ensure type safety
 * Represents a UUID string specifically for translation job items
 */
export type TranslationJobItemId = string & { readonly __brand: 'TranslationJobItemId' };

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
 * Update Translation Parameters - context for translation updates
 */
export interface UpdateTranslationParams {
  keyId: string;
  locale: string;
  projectId: string;
  // Optimistic locking support
  updatedAt?: string; // ISO 8601 timestamp
}

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
