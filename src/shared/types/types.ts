/**
 * Shared Type Definitions for i18n-mate API
 *
 * This file contains shared types used across multiple features:
 * - API response wrappers (success, error, result)
 * - Pagination types
 * - Authentication types
 *
 * Feature-specific types are organized in their respective feature directories:
 * - config/: Application configuration types
 * - export/: Export-related types
 * - keys/: Key management types
 * - locales/: Locale management types
 * - projects/: Project management types
 * - telemetry/: Event tracking types
 * - translation-jobs/: Translation job types
 * - translations/: Translation value types
 */

// ============================================================================
// API Response Types
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
 * Generic Paginated Response - standardized pagination format
 * Used across all paginated endpoints for consistency
 */
export interface PaginatedResponse<T> {
  data: T[];
  metadata: PaginationMetadata;
}

// ============================================================================
// Pagination Types
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

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Password Reset Response
 */
export interface PasswordResetResponse {
  message: string;
}

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
