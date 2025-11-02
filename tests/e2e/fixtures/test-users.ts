/**
 * Test user fixtures for E2E tests
 *
 * These credentials should match users created in your Supabase test environment.
 * For local development, use TEST_EMAIL and TEST_PASSWORD from .env
 */

export const TEST_USERS = {
  invalidUser: {
    email: 'invalid@example.com',
    password: 'WrongPassword123!',
  },
  validUser: {
    email: process.env.TEST_EMAIL || 'test@example.com',
    password: process.env.TEST_PASSWORD || 'TestPassword123!',
  },
} as const;

export const TEST_PROJECTS = {
  validProject: {
    defaultLanguage: 'en-US',
    description: 'A test project created during E2E tests',
    name: 'E2E Test Project',
    prefix: 'e2e',
  },
} as const;
