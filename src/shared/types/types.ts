/**
 * Shared Type Definitions for i18n-mate API
 *
 * This file contains shared types used across multiple features:
 * - Utility types for type transformations
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
// Utility Types
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

// ============================================================================
// API Response Types
// ============================================================================

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
 * Make specific properties non-nullable in a type
 *
 * Removes null and undefined from specified properties. Useful when you need
 * to enforce that certain fields must have values.
 *
 * @template T - The base type to transform
 * @template K - Union of property keys to make non-nullable
 *
 * @example
 * type User = { id: string | null; name: string | null };
 * type UserWithRequiredId = MakeNonNullable<User, 'id'>;
 * // Result: { id: string; name: string | null }
 */
export type MakeNonNullable<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: NonNullable<T[P]>;
};

/**
 * Make specific properties nullable in a type
 *
 * Useful for fixing auto-generated types from Supabase where RPC functions
 * incorrectly mark nullable database columns as non-nullable in return types.
 *
 * @template T - The base type to transform
 * @template K - Union of property keys to make nullable
 *
 * @example
 * type User = { id: string; name: string; email: string };
 * type UserWithNullableEmail = MakeNullable<User, 'email'>;
 * // Result: { id: string; name: string; email: string | null }
 *
 * @example
 * type Project = { name: string; description: string };
 * type ProjectWithNullables = MakeNullable<Project, 'description'>;
 * // Result: { name: string; description: string | null }
 */
export type MakeNullable<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: null | T[P];
};

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
