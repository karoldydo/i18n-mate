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
  KeyCreatedEvent,
  KeyCreatedProperties,
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
  CreateProjectLocaleRequest,
  CreateProjectLocaleResponse,
  LanguageAddedEvent,
  LanguageAddedProperties,
  ListProjectLocalesWithDefaultArgs,
  LocaleCode,
  ProjectLocale,
  ProjectLocaleInsert,
  ProjectLocaleResponse,
  ProjectLocaleUpdate,
  ProjectLocaleWithDefault,
  UpdateProjectLocaleRequest,
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
// Locales Feature Types
// ============================================================================

export type {
  CreateTelemetryEventRequest,
  EventType,
  ListTelemetryEventsParams,
  TelemetryEvent,
  TelemetryEventInsert,
  TelemetryEventProperties,
  TelemetryEventResponse,
  TelemetryEventsParams,
  TelemetryEventUnion,
  TelemetryEventUpdate,
} from './telemetry';

// ============================================================================
// Projects Feature Types
// ============================================================================

export type {
  CancelTranslationJobContext,
  CancelTranslationJobRequest,
  CancelTranslationJobRpcArgs,
  CheckActiveJobResponse,
  CreateTranslationJobRequest,
  CreateTranslationJobResponse,
  GetJobItemsParams,
  ItemStatus,
  JobStatus,
  ListTranslationJobItemsResponse,
  ListTranslationJobsParams,
  ListTranslationJobsResponse,
  TranslationJob,
  TranslationJobId,
  TranslationJobInsert,
  TranslationJobItem,
  TranslationJobItemId,
  TranslationJobItemInsert,
  TranslationJobItemResponse,
  TranslationJobItemUpdate,
  TranslationJobParams,
  TranslationJobResponse,
  TranslationJobUpdate,
  TranslationMode,
} from './translation-jobs';

// ============================================================================
// Telemetry Feature Types
// ============================================================================

// Re-export type guards from translation-jobs
export { isActiveJob, isFinishedJob } from './translation-jobs';

// ============================================================================
// Translation Jobs Feature Types
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
