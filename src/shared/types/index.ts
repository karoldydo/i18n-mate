/**
 * Type Definitions Index
 *
 * Central export point for all type definitions used in the i18n-mate application.
 * Re-exports database types and API DTOs for convenient importing throughout the codebase.
 *
 * Organization:
 * - database.types.ts: Supabase-generated database schema types (DO NOT MODIFY)
 * - types.ts: Shared types (API responses, pagination, authentication)
 * - Feature-specific types in subdirectories:
 *   - export/: Export-related types
 *   - keys/: Key management types
 *   - locales/: Locale management types
 *   - projects/: Project management types
 *   - telemetry/: Event tracking types
 *   - translation-jobs/: Translation job types
 *   - translations/: Translation value types
 */

// ============================================================================
// Database Types (Supabase-generated)
// ============================================================================

export type { AppConfig } from './config';

export type { CompositeTypes, Database, Enums, Json, Tables, TablesInsert, TablesUpdate } from './database.types';

// ============================================================================
// Shared Types (API responses, pagination, authentication)
// ============================================================================

export { Constants } from './database.types';

export type { ExportedTranslations, ExportTranslationsData } from './export';

export type {
  CreateKeyRequest,
  CreateKeyResponse,
  CreateKeyRpcArgs,
  KeyCountResponse,
  KeyDefaultViewItem,
  KeysRequest,
  KeysResponse,
  KeyTranslationItem,
  KeyTranslationsRequest,
  KeyTranslationsResponse,
} from './keys';

// ============================================================================
// Export Feature Types
// ============================================================================

export type {
  CreateLocaleRequest,
  CreateLocaleResponse,
  LocaleCode,
  LocaleItem,
  LocalesResponse,
  UpdateLocaleRequest,
  UpdateLocaleResponse,
} from './locales';

// ============================================================================
// Keys Feature Types
// ============================================================================

export type {
  CreateProjectRequest,
  CreateProjectResponse,
  CreateProjectRpcArgs,
  ProjectRequest,
  ProjectResponse,
  ProjectsRequest,
  ProjectsResponse,
  UpdateProjectRequest,
  UpdateProjectResponse,
} from './projects';

// ============================================================================
// Telemetry Feature Types
// ============================================================================

export type {
  CreateTelemetryEventRequest,
  EventType,
  KeyCreatedProperties,
  LanguageAddedProperties,
  ProjectCreatedProperties,
  TelemetryEventProperties,
  TelemetryEventResponse,
  TelemetryEventsRequest,
  TelemetryEventsResponse,
  TranslationCompletedProperties,
} from './telemetry';

// ============================================================================
// Translation Jobs Feature Types
// ============================================================================

export type {
  CancelTranslationJobContext,
  CancelTranslationJobRequest,
  CancelTranslationJobResponse,
  CancelTranslationJobRpcArgs,
  CreateTranslationJobRequest,
  CreateTranslationJobResponse,
  GetJobItemsParams,
  ItemStatus,
  JobStatus,
  ListTranslationJobsParams,
  TranslationJobItemResponse,
  TranslationJobItemsRequest,
  TranslationJobItemsResponse,
  TranslationJobParams,
  TranslationJobRequest,
  TranslationJobResponse,
  TranslationJobsRequest,
  TranslationJobsResponse,
  TranslationMode,
} from './translation-jobs';

// Re-export type guards from translation-jobs
export { isActiveJob, isFinishedJob } from './translation-jobs';

// ============================================================================
// Translations Feature Types
// ============================================================================

export type {
  Translation,
  TranslationInsert,
  TranslationResponse,
  TranslationUpdate,
  UpdateSourceType,
  UpdateTranslationRequest,
} from './translations';

export type {
  ApiErrorResponse,
  ApiResponse,
  ApiResult,
  ConflictErrorResponse,
  PaginatedResponse,
  PaginationMetadata,
  PaginationParams,
  PasswordResetRequest,
  PasswordResetResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  SignUpResponse,
  ValidationErrorResponse,
  VerifyEmailResponse,
} from './types';

// ============================================================================
// Translations Feature Types
// ============================================================================

// Re-export type guards from shared types
export { isApiErrorResponse, isApiSuccessResponse } from './types';
