/**
 * Application Configuration Types
 *
 * Types related to application-level configuration fetched from app_config table.
 */

/**
 * Application Configuration - fetched from app_config table via get_public_app_config RPC
 *
 * Controls application-level features and behavior:
 * - emailVerificationRequired: Whether users must verify email before accessing protected routes
 * - registrationEnabled: Whether new user registration is allowed
 */
export interface AppConfig {
  emailVerificationRequired: boolean;
  registrationEnabled: boolean;
}
