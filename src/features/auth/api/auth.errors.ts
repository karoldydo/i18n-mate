import type { AuthError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { AUTH_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

/**
 * Handle authentication errors and convert them to API errors
 *
 * Maps Supabase AuthError instances to standardized ApiErrorResponse format
 * with appropriate HTTP status codes and user-friendly error messages.
 *
 * @param {AuthError} authError - AuthError from Supabase Auth
 * @param {string} [context] - Optional context string for logging (e.g., hook name)
 * @param {string} [fallbackMessage] - Optional custom fallback message for generic errors
 *
 * @returns {ApiErrorResponse} Standardized ApiErrorResponse object
 */
export function createAuthErrorResponse(
  authError: AuthError,
  context?: string,
  fallbackMessage?: string
): ApiErrorResponse {
  const logPrefix = context ? `[${context}]` : '[handleAuthError]';
  console.error(`${logPrefix} Auth error:`, authError);

  // map common Supabase Auth error messages to standardized responses
  const errorMessage = authError.message.toLowerCase();

  // invalid credentials (wrong email/password)
  if (
    errorMessage.includes('invalid login credentials') ||
    errorMessage.includes('invalid email or password') ||
    errorMessage.includes('email not confirmed')
  ) {
    return createApiErrorResponse(401, AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  // email not confirmed
  if (errorMessage.includes('email not confirmed') || errorMessage.includes('email must be confirmed')) {
    return createApiErrorResponse(403, AUTH_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED);
  }

  // user already exists (signup with existing email)
  if (errorMessage.includes('user already registered') || errorMessage.includes('email already exists')) {
    return createApiErrorResponse(409, AUTH_ERROR_MESSAGES.EMAIL_ALREADY_IN_USE);
  }

  // weak password
  if (errorMessage.includes('password') && errorMessage.includes('weak')) {
    return createApiErrorResponse(400, AUTH_ERROR_MESSAGES.PASSWORD_TOO_WEAK);
  }

  // invalid email format
  if (errorMessage.includes('invalid email')) {
    return createApiErrorResponse(400, AUTH_ERROR_MESSAGES.EMAIL_INVALID);
  }

  // rate limit exceeded (too many attempts)
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return createApiErrorResponse(429, AUTH_ERROR_MESSAGES.TOO_MANY_REQUESTS);
  }

  // token expired or invalid (password reset, email verification)
  if (errorMessage.includes('token') && (errorMessage.includes('expired') || errorMessage.includes('invalid'))) {
    return createApiErrorResponse(401, AUTH_ERROR_MESSAGES.TOKEN_EXPIRED);
  }

  // network/connection errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return createApiErrorResponse(503, AUTH_ERROR_MESSAGES.NETWORK_ERROR);
  }

  // registration disabled (from Edge Function)
  if (errorMessage.includes('registration') && errorMessage.includes('disabled')) {
    return createApiErrorResponse(403, AUTH_ERROR_MESSAGES.REGISTRATION_DISABLED);
  }

  // generic auth error (fallback)
  return createApiErrorResponse(500, fallbackMessage || AUTH_ERROR_MESSAGES.GENERIC_ERROR, {
    original: authError,
  });
}
