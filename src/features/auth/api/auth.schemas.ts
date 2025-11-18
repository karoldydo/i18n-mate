import { z } from 'zod';

import {
  AUTH_EMAIL_MAX_LENGTH,
  AUTH_ERROR_MESSAGES,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_PASSWORD_PATTERN,
} from '@/shared/constants';

/**
 * Login form validation schema
 *
 * Validates email and password fields for user authentication.
 * Email must be a valid email address with max length constraints.
 * Password is required but format is not validated (handled by Supabase).
 */
export const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, AUTH_ERROR_MESSAGES.EMAIL_REQUIRED)
    .max(AUTH_EMAIL_MAX_LENGTH, 'Email is too long')
    .email(AUTH_ERROR_MESSAGES.EMAIL_INVALID),
  password: z.string().min(1, AUTH_ERROR_MESSAGES.PASSWORD_REQUIRED),
});

/**
 * Type inferred from loginFormSchema
 *
 * Contains email and password fields for user authentication.
 */
export type LoginFormData = z.infer<typeof loginFormSchema>;

/**
 * Registration form validation schema
 *
 * Validates email, password, and password confirmation fields for user registration.
 * Email must be a valid email address with max length constraints.
 * Password must meet minimum length, maximum length, and pattern requirements.
 * Password confirmation must match the password field.
 */
export const registerFormSchema = z
  .object({
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    email: z
      .string()
      .min(1, AUTH_ERROR_MESSAGES.EMAIL_REQUIRED)
      .max(AUTH_EMAIL_MAX_LENGTH, 'Email is too long')
      .email(AUTH_ERROR_MESSAGES.EMAIL_INVALID),
    password: z
      .string()
      .min(AUTH_PASSWORD_MIN_LENGTH, AUTH_ERROR_MESSAGES.PASSWORD_TOO_SHORT)
      .max(AUTH_PASSWORD_MAX_LENGTH, AUTH_ERROR_MESSAGES.PASSWORD_TOO_LONG)
      .regex(AUTH_PASSWORD_PATTERN, AUTH_ERROR_MESSAGES.PASSWORD_PATTERN),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: AUTH_ERROR_MESSAGES.PASSWORD_MISMATCH,
    path: ['confirmPassword'],
  });

/**
 * Type inferred from registerFormSchema
 *
 * Contains email, password, and password confirmation fields for user registration.
 */
export type RegisterFormData = z.infer<typeof registerFormSchema>;

/**
 * Forgot password form validation schema
 *
 * Validates email field for password reset request.
 * Email must be a valid email address with max length constraints.
 */
export const forgotPasswordFormSchema = z.object({
  email: z
    .string()
    .min(1, AUTH_ERROR_MESSAGES.EMAIL_REQUIRED)
    .max(AUTH_EMAIL_MAX_LENGTH, 'Email is too long')
    .email(AUTH_ERROR_MESSAGES.EMAIL_INVALID),
});

/**
 * Type inferred from forgotPasswordFormSchema
 *
 * Contains email field for password reset request.
 */
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordFormSchema>;

/**
 * Reset password form validation schema
 *
 * Validates password and password confirmation fields for password reset.
 * Password must meet minimum length, maximum length, and pattern requirements.
 * Password confirmation must match the password field.
 */
export const resetPasswordFormSchema = z
  .object({
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    password: z
      .string()
      .min(AUTH_PASSWORD_MIN_LENGTH, AUTH_ERROR_MESSAGES.PASSWORD_TOO_SHORT)
      .max(AUTH_PASSWORD_MAX_LENGTH, AUTH_ERROR_MESSAGES.PASSWORD_TOO_LONG)
      .regex(AUTH_PASSWORD_PATTERN, AUTH_ERROR_MESSAGES.PASSWORD_PATTERN),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: AUTH_ERROR_MESSAGES.PASSWORD_MISMATCH,
    path: ['confirmPassword'],
  });

/**
 * Type inferred from resetPasswordFormSchema
 *
 * Contains password and password confirmation fields for password reset.
 */
export type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;
