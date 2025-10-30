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
 */
export const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, AUTH_ERROR_MESSAGES.EMAIL_REQUIRED)
    .max(AUTH_EMAIL_MAX_LENGTH, 'Email is too long')
    .email(AUTH_ERROR_MESSAGES.EMAIL_INVALID),
  password: z.string().min(1, AUTH_ERROR_MESSAGES.PASSWORD_REQUIRED),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

/**
 * Registration form validation schema
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

export type RegisterFormData = z.infer<typeof registerFormSchema>;

/**
 * Forgot password form validation schema
 */
export const forgotPasswordFormSchema = z.object({
  email: z
    .string()
    .min(1, AUTH_ERROR_MESSAGES.EMAIL_REQUIRED)
    .max(AUTH_EMAIL_MAX_LENGTH, 'Email is too long')
    .email(AUTH_ERROR_MESSAGES.EMAIL_INVALID),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordFormSchema>;

/**
 * Reset password form validation schema
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

export type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;
