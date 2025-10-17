/**
 * Type Definitions Index
 *
 * Central export point for all type definitions used in the i18n-mate application.
 * Re-exports database types and API DTOs for convenient importing throughout the codebase.
 */

// Re-export all database types
export type { CompositeTypes, Database, Enums, Json, Tables, TablesInsert, TablesUpdate } from './database.types';

export { Constants } from './database.types';

// Re-export all DTO and Command Model types
export type {
  // Helper Types
  ApiErrorResponse,
  // Error Response Types
  ApiResponse,
  ApiResult,
  // Translation DTOs
  BulkUpdateTranslationRequest,
  // Translation Job DTOs
  CancelTranslationJobRequest,
  ConflictErrorResponse,
  // Key DTOs
  CreateKeyRequest,
  CreateKeyResponse,
  // RPC Function Types
  CreateKeyWithValueArgs,
  // Project Locale DTOs
  CreateProjectLocaleRequest,
  // Project DTOs
  CreateProjectRequest,
  CreateProjectWithDefaultLocaleRequest,
  // Telemetry DTOs
  CreateTelemetryEventRequest,
  CreateTranslationJobRequest,
  CreateTranslationJobResponse,
  // Enum Types
  EventType,
  // Export DTOs
  ExportedTranslations,
  ExportTranslationsData,
  ItemStatus,
  JobStatus,
  // Base Entity Types
  Key,
  KeyCreatedProperties,
  KeyDefaultView,
  KeyInsert,
  KeyPerLanguageView,
  KeyResponse,
  KeyUpdate,
  LanguageAddedProperties,
  ListKeysDefaultViewArgs,
  // Pagination & Query Parameters
  ListKeysParams,
  ListKeysPerLanguageParams,
  ListKeysPerLanguageViewArgs,
  ListProjectLocalesWithDefaultArgs,
  ListProjectsParams,
  ListProjectsWithCountsArgs,
  ListTranslationJobsParams,
  PaginationMetadata,
  PaginationParams,
  // Authentication DTOs
  PasswordResetRequest,
  PasswordResetResponse,
  Project,
  ProjectCreatedProperties,
  ProjectInsert,
  ProjectListResponse,
  ProjectLocale,
  ProjectLocaleInsert,
  ProjectLocaleResponse,
  ProjectLocaleUpdate,
  ProjectLocaleWithDefault,
  ProjectResponse,
  ProjectUpdate,
  ProjectWithCounts,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  SignUpResponse,
  TelemetryEvent,
  TelemetryEventInsert,
  TelemetryEventProperties,
  TelemetryEventResponse,
  TelemetryEventUpdate,
  Translation,
  TranslationCompletedProperties,
  TranslationInsert,
  TranslationJob,
  TranslationJobInsert,
  TranslationJobItem,
  TranslationJobItemInsert,
  TranslationJobItemResponse,
  TranslationJobItemUpdate,
  TranslationJobParams,
  TranslationJobResponse,
  TranslationJobUpdate,
  TranslationMode,
  TranslationResponse,
  TranslationUpdate,
  UpdateProjectLocaleRequest,
  UpdateProjectRequest,
  UpdateSourceType,
  UpdateTranslationRequest,
  ValidationErrorResponse,
  VerifyEmailResponse,
} from './types';

// Re-export type guards
export { isActiveJob, isApiErrorResponse, isApiSuccessResponse, isFinishedJob } from './types';
