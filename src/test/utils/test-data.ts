/**
 * Test data fixtures and generators for unit tests
 *
 * This file provides reusable test data for common entities.
 * Use these fixtures to ensure consistency across tests.
 */

import type { TelemetryEventResponse } from '@/shared/types';

/**
 * Creates a mock project object with counts for testing
 * Use this for testing single project operations (useProject, detail views)
 * Returns ProjectResponse type (with key_count and locale_count)
 */
export function createMockProject(overrides?: {
  created_at?: string;
  default_locale?: string;
  description?: null | string;
  id?: string;
  key_count?: number;
  locale_count?: number;
  name?: string;
  prefix?: string;
  updated_at?: string;
}) {
  const defaults = {
    created_at: '2025-01-15T10:00:00Z',
    default_locale: 'en',
    description: 'Test project',
    id: generateTestUuid(),
    key_count: 0,
    locale_count: 1,
    name: 'Test Project',
    prefix: 'test',
    updated_at: '2025-01-15T10:00:00Z',
  };

  return {
    ...defaults,
    ...overrides,
    key_count: overrides?.key_count ?? defaults.key_count,
    locale_count: overrides?.locale_count ?? defaults.locale_count,
  };
}

/**
 * Creates a mock project locale for testing
 */
export function createMockProjectLocale(overrides?: {
  created_at?: string;
  id?: string;
  is_default?: boolean;
  label?: string;
  locale?: string;
  project_id?: string;
  updated_at?: string;
}) {
  return {
    created_at: '2025-01-15T10:00:00Z',
    id: generateTestUuid(),
    is_default: false,
    label: 'English',
    locale: 'en',
    project_id: generateTestUuid(),
    updated_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

/**
 * Creates a mock project list item for testing
 * Use this for testing list operations (useProjects)
 * Returns ProjectsResponse['data'][0] type (with key_count, locale_count, and total_count)
 */
export function createMockProjects(overrides?: {
  created_at?: string;
  default_locale?: string;
  description?: null | string;
  id?: string;
  key_count?: number;
  locale_count?: number;
  name?: string;
  prefix?: string;
  total_count?: number;
  updated_at?: string;
}) {
  return {
    created_at: '2025-01-15T10:00:00Z',
    default_locale: 'en',
    description: 'Test project',
    id: generateTestUuid(),
    key_count: 10,
    locale_count: 2,
    name: 'Test Project',
    prefix: 'test',
    total_count: 1,
    updated_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

/**
 * Creates a mock Supabase error
 */
export function createMockSupabaseError(message: string, code = 'PGRST116') {
  return {
    code,
    details: null,
    hint: null,
    message,
  };
}

/**
 * Creates a mock Supabase response
 */
export function createMockSupabaseResponse<T>(data: T, error: null | unknown = null) {
  return {
    data,
    error,
  };
}

/**
 * Creates a mock telemetry event for testing
 */
export function createMockTelemetryEvent(overrides?: Partial<TelemetryEventResponse>): TelemetryEventResponse {
  return {
    created_at: '2025-01-15T10:00:00Z',
    event_name: 'project_created',
    id: generateTestUuid(),
    project_id: generateTestUuid(),
    properties: null,
    ...overrides,
  };
}

/**
 * Generates a unique ID for testing
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generates a valid UUID v4 for testing
 */
export function generateTestUuid(): string {
  return '550e8400-e29b-41d4-a716-446655440000';
}

/**
 * Mock Supabase environment variables for testing
 */
export const TEST_SUPABASE_URL = 'https://test.supabase.co';
export const TEST_SUPABASE_ANON_KEY = 'test-anon-key';
