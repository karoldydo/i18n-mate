/**
 * Authentication Constants and Validation Patterns
 *
 * Centralized definitions for authentication validation patterns to ensure consistency
 * between TypeScript validation (Zod schemas) and application requirements.
 */

/**
 * Minimum password length
 */
export const AUTH_PASSWORD_MIN_LENGTH = 8;

/**
 * Maximum password length
 */
export const AUTH_PASSWORD_MAX_LENGTH = 128;

/**
 * Maximum email length (RFC 5322)
 */
export const AUTH_EMAIL_MAX_LENGTH = 320;

/**
 * Password validation pattern - at least one letter and one digit
 */
export const AUTH_PASSWORD_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).+$/;

/**
 * Error messages for authentication operations
 */
export const AUTH_ERROR_MESSAGES = {
  EMAIL_ALREADY_IN_USE: 'An account with this email already exists',
  EMAIL_INVALID: 'Please enter a valid email address',
  EMAIL_NOT_CONFIRMED: 'Please verify your email address before logging in',
  EMAIL_REQUIRED: 'Email is required',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again',
  INVALID_CREDENTIALS: 'Invalid email or password',
  NETWORK_ERROR: 'Network error. Please check your connection and try again',
  PASSWORD_MISMATCH: 'Passwords do not match',
  PASSWORD_PATTERN: 'Password must contain at least one letter and one digit',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_TOO_LONG: `Password must be at most ${AUTH_PASSWORD_MAX_LENGTH} characters`,
  PASSWORD_TOO_SHORT: `Password must be at least ${AUTH_PASSWORD_MIN_LENGTH} characters`,
  PASSWORD_TOO_WEAK: 'Password is too weak. Please choose a stronger password',
  REGISTRATION_DISABLED: 'Registration is currently disabled. Please contact support',
  TOKEN_EXPIRED: 'This link has expired. Please request a new one',
  TOO_MANY_REQUESTS: 'Too many attempts. Please try again later',
  USER_ALREADY_EXISTS: 'An account with this email already exists',
} as const;

/**
 * Success messages for authentication operations
 */
export const AUTH_SUCCESS_MESSAGES = {
  EMAIL_SENT: 'Check your email for further instructions',
  PASSWORD_RESET: 'Your password has been successfully reset',
  REGISTRATION_SUCCESS: 'Account created successfully. Please check your email to verify your account',
  VERIFICATION_RESENT: 'Verification email sent. Please check your inbox',
} as const;
