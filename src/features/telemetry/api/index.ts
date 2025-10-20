/**
 * Telemetry Events API
 *
 * This module provides TanStack Query hooks for reading telemetry events and KPI tracking.
 * Telemetry events are created automatically by database triggers and RPC functions.
 *
 * All hooks use the shared Supabase client from context and follow React Query best practices.
 *
 * @module features/telemetry/api
 */

// Error Utilities
export { createDatabaseErrorResponse } from './telemetry.errors';

// Query Keys
export { telemetryKeys } from './telemetry.keys';

// Validation Schemas
export * from './telemetry.schemas';

// Query Hooks
export { useTelemetryEvents } from './useTelemetryEvents/useTelemetryEvents';
