# API Endpoint Implementation Plan: Telemetry Events

## 1. Endpoint Overview

The Telemetry Events API provides read-only access to application events and KPIs. Events are stored in a partitioned table (by month) and are append-only to maintain audit trail integrity.

**Important:** Telemetry events are created **automatically** by database triggers and RPC functions. There is no manual POST endpoint for UI use. Events are emitted when:

- Projects are created (`project_created` - via `create_project_with_default_locale` RPC)
- Locales are added (`language_added` - via `emit_language_added_event_trigger` trigger)
- Keys are created (`key_created` - via `emit_key_created_event_trigger` trigger)
- Translations are completed (`translation_completed` - via Edge Function during LLM translation)

### Key Features

- Paginated event listing with filtering by project
- **Automatic event creation** via database triggers and RPC functions (no manual POST needed)
- Partitioned storage (monthly) for efficient querying and maintenance
- Append-only events (no updates or deletes) for audit trail integrity
- Event-specific properties stored as JSONB
- RLS-based access control (owner or service_role only)

### Endpoints Summary

1. **List Telemetry Events** - `GET /rest/v1/telemetry_events?project_id=eq.{project_id}&order=created_at.desc&limit=100`

**Note:** No POST endpoint is exposed to the UI. All telemetry is handled automatically by the database.

## 2. Request Details

### 2.1 List Telemetry Events

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/telemetry_events?project_id=eq.{project_id}&order=created_at.desc&limit=100`
- **Authentication:** Required (JWT via Authorization header)
- **Authorization:** Owner or service_role only
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project ID (via query filter)
  - Optional:
    - `limit` (number) - Items per page (default: 100, max: 1000)
    - `offset` (number) - Pagination offset (default: 0)
    - `order` (string) - Sort order (default: `created_at.desc`)
- **Request Body:** None

**Example Request:**

```http
GET /rest/v1/telemetry_events?project_id=eq.550e8400-e29b-41d4-a716-446655440000&order=created_at.desc&limit=100
Authorization: Bearer {access_token}
```

## 2.2 How Telemetry Events Are Created

Telemetry events are created **automatically** by the database. No manual POST endpoint is needed for UI use.

### Automatic Event Creation

**1. `project_created` Event**

- **Trigger:** RPC function `create_project_with_default_locale`
- **Location:** `supabase/migrations/20251018001300_add_default_locale_telemetry.sql`
- **Properties:** `{ locale_count: 1, default_locale: "en" }`
- **Emitted when:** User creates a new project

**2. `language_added` Event**

- **Trigger:** Database trigger `emit_language_added_event_trigger`
- **Location:** `supabase/migrations/20251018000000_fix_locale_telemetry_trigger.sql`
- **Properties:** `{ locale: "pl", locale_count: 2, is_default: false }`
- **Emitted when:**
  - User adds a new locale to project
  - Default locale is created during project setup

**3. `key_created` Event**

- **Trigger:** Database trigger `emit_key_created_event_trigger`
- **Location:** `supabase/migrations/20251017170000_add_keys_rpcs_and_telemetry.sql`
- **Properties:** `{ full_key: "app.home.title", key_count: 50 }`
- **Emitted when:** User creates a new translation key

**4. `translation_completed` Event**

- **Trigger:** Edge Function during LLM translation job completion
- **Location:** `supabase/functions/translate/index.ts` (implementation pending)
- **Properties:** `{ mode: "all", target_locale: "pl", completed_keys: 98, failed_keys: 2 }`
- **Emitted when:** LLM translation job finishes (success or partial success)

## 3. Used Types

**Note:** As of the latest refactoring, all types are organized by feature in separate directories under `src/shared/types/`.

### 3.1 Existing Types

**Import Path:** `@/shared/types` (central export) or `@/shared/types/telemetry` (feature-specific)

**Shared Types** (from `src/shared/types/types.ts`):

- `PaginationParams` - Query parameters for pagination
- `PaginationMetadata` - Response metadata with total count
- `ApiErrorResponse` - Generic error response wrapper
- `ValidationErrorResponse` - 400 validation error response

**Telemetry Types** (from `src/shared/types/telemetry/index.ts`):

```typescript
// Base types
export type EventType = Enums<'event_type'>; // 'project_created' | 'language_added' | 'key_created' | 'translation_completed'

// Response DTOs
export type TelemetryEventResponse = TelemetryEvent;

export type TelemetryEvent = Tables<'telemetry_events'>;

// Request DTOs
export type CreateTelemetryEventRequest = Pick<TelemetryEventInsert, 'event_name' | 'project_id' | 'properties'>;

// Event-specific property types
export interface ProjectCreatedProperties {
  locale_count: number;
}

export interface LanguageAddedProperties {
  locale: string;
  locale_count: number;
}

export interface KeyCreatedProperties {
  full_key: string;
  key_count: number;
}

export interface TranslationCompletedProperties {
  completed_keys: number;
  failed_keys: number;
  mode: TranslationMode; // 'all' | 'selected' | 'single'
  target_locale: string;
}

// Union type for properties
export type TelemetryEventProperties =
  | ProjectCreatedProperties
  | LanguageAddedProperties
  | KeyCreatedProperties
  | TranslationCompletedProperties;

// Union type for all telemetry events
export type TelemetryEventUnion =
  | ProjectCreatedEvent
  | LanguageAddedEvent
  | KeyCreatedEvent
  | TranslationCompletedEvent;

// Event types with full structure
export interface ProjectCreatedEvent {
  created_at: string;
  event_name: 'project_created';
  project_id: string;
  properties: ProjectCreatedProperties;
}

export interface LanguageAddedEvent {
  created_at: string;
  event_name: 'language_added';
  project_id: string;
  properties: LanguageAddedProperties;
}

export interface KeyCreatedEvent {
  created_at: string;
  event_name: 'key_created';
  project_id: string;
  properties: KeyCreatedProperties;
}

export interface TranslationCompletedEvent {
  created_at: string;
  event_name: 'translation_completed';
  project_id: string;
  properties: TranslationCompletedProperties;
}

// Error types (already defined in shared types)
export interface ApiErrorResponse {
  data: null;
  error: {
    code: number;
    details?: Record<string, unknown>;
    message: string;
  };
}

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
```

### 3.2 New Types and Schemas

Create in `src/features/telemetry/api/telemetry.schemas.ts`:

**Note:** We only need validation for the GET endpoint. Event creation is handled automatically by the database.

```typescript
import { z } from 'zod';

import {
  TELEMETRY_DEFAULT_LIMIT,
  TELEMETRY_ERROR_MESSAGES,
  TELEMETRY_EVENT_TYPES,
  TELEMETRY_MAX_LIMIT,
  TELEMETRY_MIN_OFFSET,
  TELEMETRY_SORT_OPTIONS,
} from '@/shared/constants';
import type { EventType, Json, ListTelemetryEventsParams, TelemetryEventResponse } from '@/shared/types';

const JSON_SCHEMA: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JSON_SCHEMA),
    z.record(z.union([JSON_SCHEMA, z.undefined()])),
  ])
);

// event name enum (for response validation)
export const EVENT_NAME_SCHEMA = z.enum([
  TELEMETRY_EVENT_TYPES.PROJECT_CREATED,
  TELEMETRY_EVENT_TYPES.LANGUAGE_ADDED,
  TELEMETRY_EVENT_TYPES.KEY_CREATED,
  TELEMETRY_EVENT_TYPES.TRANSLATION_COMPLETED,
]) satisfies z.ZodType<EventType>;

// list telemetry events schema
export const LIST_TELEMETRY_EVENTS_SCHEMA = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(TELEMETRY_MAX_LIMIT, TELEMETRY_ERROR_MESSAGES.LIMIT_TOO_HIGH)
    .optional()
    .default(TELEMETRY_DEFAULT_LIMIT),
  offset: z
    .number()
    .int()
    .min(TELEMETRY_MIN_OFFSET, TELEMETRY_ERROR_MESSAGES.NEGATIVE_OFFSET)
    .optional()
    .default(TELEMETRY_MIN_OFFSET),
  order: z
    .enum([TELEMETRY_SORT_OPTIONS.CREATED_AT_ASC, TELEMETRY_SORT_OPTIONS.CREATED_AT_DESC])
    .optional()
    .default(TELEMETRY_SORT_OPTIONS.CREATED_AT_DESC),
  project_id: z.string().uuid(TELEMETRY_ERROR_MESSAGES.INVALID_PROJECT_ID),
}) satisfies z.ZodType<ListTelemetryEventsParams>;

// response schema for runtime validation
export const TELEMETRY_EVENT_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  event_name: EVENT_NAME_SCHEMA,
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  properties: JSON_SCHEMA.nullable(),
}) satisfies z.ZodType<TelemetryEventResponse>;
```

### 3.3 New Interface Types

Create in `src/shared/types/types.ts` (if not already present):

```typescript
/**
 * List Telemetry Events Query Parameters
 */
export interface ListTelemetryEventsParams extends PaginationParams {
  order?: 'created_at.asc' | 'created_at.desc';
  project_id: string;
}
```

## 4. Response Details

### 4.1 List Telemetry Events

**Success Response (200 OK):**

Returns an array of telemetry events (Supabase PostgREST default for SELECT queries without `.single()`):

```json
[
  {
    "created_at": "2025-01-15T10:20:00Z",
    "event_name": "translation_completed",
    "id": "uuid",
    "project_id": "uuid",
    "properties": {
      "completed_keys": 98,
      "failed_keys": 2,
      "mode": "all",
      "target_locale": "pl"
    }
  },
  {
    "created_at": "2025-01-15T10:15:00Z",
    "event_name": "key_created",
    "id": "uuid",
    "project_id": "uuid",
    "properties": {
      "full_key": "app.home.title",
      "key_count": 50
    }
  }
]
```

**Note:** This endpoint returns a raw array (not wrapped in `{ data, metadata }`) since it's a simple PostgREST query. Pagination metadata can be extracted from the `Content-Range` header if count is enabled.

### 4.2 Automatic Event Creation (No API Response)

Events are created automatically by database triggers and RPC functions. There is no API response for event creation since it happens server-side as a side effect of other operations (creating projects, adding locales, creating keys, completing translation jobs).

### 4.3 Error Responses

All error responses follow the structure: `{ data: null, error: { code, message, details? } }`

**400 Bad Request (Validation Error):**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "details": {
      "constraint": "enum",
      "field": "event_name"
    },
    "message": "Invalid event name. Must be one of the allowed telemetry events"
  }
}
```

**401 Unauthorized:**

```json
{
  "data": null,
  "error": {
    "code": 401,
    "message": "Authentication required"
  }
}
```

**403 Forbidden:**

```json
{
  "data": null,
  "error": {
    "code": 403,
    "message": "Not owner or service_role"
  }
}
```

**404 Not Found (Project):**

```json
{
  "data": null,
  "error": {
    "code": 404,
    "message": "Project not found or access denied"
  }
}
```

**500 Internal Server Error:**

```json
{
  "data": null,
  "error": {
    "code": 500,
    "message": "An unexpected error occurred"
  }
}
```

## 5. Data Flow

### 5.1 List Telemetry Events Flow

1. User navigates to analytics/dashboard view in React component
2. TanStack Query hook (`useTelemetryEvents`) is invoked with project ID and optional params
3. Hook validates params using Zod schema
4. Hook retrieves Supabase client from `useSupabase()` context
5. Client calls `.from('telemetry_events').select('*').eq('project_id', projectId).order().limit().range()`
6. RLS policy validates ownership: `project_id in (select id from projects where owner_user_id = auth.uid())`
7. PostgreSQL queries the partitioned table (automatically routes to correct partition based on created_at)
8. Results are returned as array ordered by created_at DESC (most recent first)
9. Hook validates response data using Zod schema
10. TanStack Query caches results
11. Component renders analytics dashboard with event timeline

### 5.2 Automatic Telemetry Event Creation Flow

Telemetry events are created automatically as side effects of user actions. Here's how it works:

**Example: Adding a new locale to a project**

1. User submits "Add Locale" form with locale code "pl" and label "Polski"
2. `useCreateProjectLocale` mutation hook calls Supabase `.insert()` on `project_locales` table
3. Database validates and inserts the locale record
4. **Trigger fires:** `emit_language_added_event_trigger` (AFTER INSERT on project_locales)
5. Trigger function:
   - Counts total locales for the project
   - Checks if this is the default locale
   - Inserts telemetry event into `telemetry_events` table with properties
6. PostgreSQL determines correct partition based on current timestamp
7. Event record is inserted with auto-generated UUID and timestamp
8. Original INSERT operation completes successfully
9. User receives success response for "Add Locale" action
10. Event is now available for analytics queries via GET endpoint

**Key Point:** The UI never directly calls a telemetry POST endpoint. All events are side effects of other operations, captured automatically by the database.

## 6. Security Considerations

### 6.1 Authentication

- All endpoints require valid JWT access token in `Authorization: Bearer {token}` header
- Token is obtained via Supabase Auth during sign-in
- Token is stored in Supabase client session and automatically included in requests
- Token expiration is handled by Supabase client with automatic refresh

### 6.2 Authorization

- Row-Level Security (RLS) policies enforce project ownership validation
- RLS on `telemetry_events` table filters by project ownership
- Users can only access telemetry for projects they own
- Service role can insert events for any project (for backend operations)
- RLS policies are defined in `supabase/migrations/20251013143400_create_rls_policies.sql`
- Policy names:
  - `telemetry_events_select_policy` - SELECT where project.owner_user_id = auth.uid()
  - `telemetry_events_insert_authenticated_policy` - INSERT where project.owner_user_id = auth.uid()
  - `telemetry_events_insert_service_policy` - INSERT for service_role (bypasses ownership check)

### 6.3 Input Validation

- **Client-side validation:** Zod schemas validate all input before sending to backend
- **Database-level validation:** CHECK constraints on enum columns (event_name)
- **JSONB validation:** Properties are validated against event-specific schemas
- **Immutability enforcement:** No UPDATE or DELETE operations allowed (RLS policies omit these)

### 6.4 SQL Injection Prevention

- Supabase client uses parameterized queries for all operations
- Never construct raw SQL strings from user input
- JSONB properties are safely handled by PostgreSQL JSONB type

### 6.5 Data Exposure

- All fields are safe to expose in API responses (no sensitive data)
- RLS policies ensure users can only access their own project's telemetry
- Properties JSONB field may contain event-specific metadata but should not include PII

### 6.6 Partition Management

- Monthly partitions prevent performance degradation on large datasets
- Automatic partition creation ensures events are never lost
- Old partitions can be archived or dropped for data retention compliance

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Invalid project_id format (not UUID)
- Invalid event_name (not in enum)
- Invalid properties structure (missing required fields, wrong types)
- Invalid pagination params (negative offset, limit > 1000)
- Properties don't match event_name schema

**Handling:**

Zod validation errors are automatically converted to ApiErrorResponse format by the global QueryClient error handler configured in `src/app/config/queryClient/queryClient.ts`. This ensures consistent error format across all queries and mutations without requiring try/catch blocks in individual hooks.

**Result Format:**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "details": {
      "constraint": "enum",
      "field": "event_name"
    },
    "message": "Invalid event name. Must be one of the allowed telemetry events"
  }
}
```

### 7.2 Authorization Errors (403/404)

**Trigger Conditions:**

- User attempts to access telemetry for project owned by another user
- RLS policy denies access

**Handling:**

- Supabase returns empty result set for SELECT queries
- Return 404 "Project not found or access denied" to avoid leaking existence
- Do not distinguish between "doesn't exist" and "access denied"

### 7.3 Not Found Errors (404)

**Trigger Conditions:**

- Project ID doesn't exist
- RLS policy denies access (appears as not found)

**Handling:**

```typescript
import { createApiErrorResponse } from '@/shared/utils';

const { data, error } = await supabase
  .from('telemetry_events')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false })
  .limit(limit)
  .range(offset, offset + limit - 1);

if (error) {
  throw createDatabaseErrorResponse(error, 'useTelemetryEvents', 'Failed to fetch telemetry events');
}

// Empty array is valid (no events yet), not an error
```

### 7.4 Server Errors (500)

**Trigger Conditions:**

- Database connection failure
- Partition doesn't exist and auto-creation fails
- JSONB parsing error
- Unexpected database constraint violation

**Handling:**

- Log full error details to console (development)
- Return generic message to user: "An unexpected error occurred. Please try again."
- Do not expose internal error details to client

**Example:**

```typescript
const { data, error } = await supabase.from('telemetry_events').insert(validatedData).select('id,created_at').single();

if (error) {
  throw createDatabaseErrorResponse(error, 'useCreateTelemetryEvent', 'Failed to create telemetry event');
}

// The createDatabaseErrorResponse function logs the error and returns a structured ApiErrorResponse
// For unknown errors, it returns a 500 status with the fallback message
```

## 8. Performance Considerations

### 8.1 Query Optimization

**Indexing:**

- Primary key composite index on `(id, created_at)` for partition routing
- Foreign key index on `project_id` for efficient RLS filtering and queries
- Partitioning by `created_at` (monthly) for efficient time-based queries
- Indexes defined in `supabase/migrations/20251013143200_create_indexes.sql`

**Pagination:**

- Use `limit` and `offset` for pagination
- Default limit of 100 balances UX and performance
- Max limit of 1000 prevents excessive data transfer
- Use `created_at.desc` ordering for most recent events first

**Selective Fetching:**

- Fetch all columns by default (table is relatively small per row)
- Consider projecting only required fields for large result sets
- Use time-based filtering for dashboard views (last 30 days, etc.)

### 8.2 Caching Strategy

**TanStack Query Configuration:**

```typescript
// List telemetry events: 5-minute cache (frequently changing data)
staleTime: 5 * 60 * 1000,
gcTime: 10 * 60 * 1000,

// No caching for mutations (create event)
// Events are append-only, no need for optimistic updates
```

**Cache Invalidation:**

- Create event → optionally invalidate list cache (usually not needed since events are historical)
- Consider not invalidating cache for background/automated events to reduce refetch load
- Only invalidate if user action triggers event creation (manual logging)

### 8.3 Partitioning Strategy

**Monthly Partitions:**

- Partitions created automatically via cron job or trigger
- Each partition stores events for one calendar month
- Query planner automatically selects correct partition based on `created_at` filter
- Old partitions can be archived or dropped for compliance/cost savings

**Partition Maintenance:**

- Monitor partition creation success via logs
- Set up alerts for failed partition creation
- Pre-create future partitions during low-traffic periods
- Consider retention policies (e.g., drop partitions older than 2 years)

### 8.4 Database Performance

**Write Performance:**

- Append-only table (no updates/deletes) is optimal for write performance
- Partitioning prevents table bloat and maintains consistent write performance
- Bulk inserts supported for Edge Function batch operations

**Read Performance:**

- Time-based queries benefit from partition pruning
- project_id index enables efficient filtering
- Consider materialized views for aggregated analytics queries

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

```bash
mkdir -p src/features/telemetry/api
```

### Step 2: Create Telemetry Constants

Create `src/shared/constants/telemetry.constants.ts` with centralized constants, patterns, and utilities:

```typescript
/**
 * Telemetry Constants and Validation Patterns
 *
 * Centralized definitions for telemetry event types and validation to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL enum constraints.
 */

// Event types (must match database enum: event_type)
export const TELEMETRY_EVENT_TYPES = {
  KEY_CREATED: 'key_created',
  LANGUAGE_ADDED: 'language_added',
  PROJECT_CREATED: 'project_created',
  TRANSLATION_COMPLETED: 'translation_completed',
} as const;

// Pagination defaults
export const TELEMETRY_DEFAULT_LIMIT = 100;
export const TELEMETRY_MAX_LIMIT = 1000;
export const TELEMETRY_MIN_OFFSET = 0;

// Sorting options
export const TELEMETRY_SORT_OPTIONS = {
  CREATED_AT_ASC: 'created_at.asc',
  CREATED_AT_DESC: 'created_at.desc',
} as const;

// PostgreSQL error codes
export const TELEMETRY_PG_ERROR_CODES = {
  CHECK_VIOLATION: '23514',
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
} as const;

// Centralized error messages
export const TELEMETRY_ERROR_MESSAGES = {
  // Generic errors
  DATABASE_ERROR: 'Database operation failed',
  // Validation errors
  INVALID_EVENT_NAME: 'Invalid event name. Must be one of the allowed telemetry events',
  INVALID_PROJECT_ID: 'Invalid project ID format',
  LIMIT_TOO_HIGH: `Limit must be at most ${TELEMETRY_MAX_LIMIT}`,
  NEGATIVE_OFFSET: 'Offset must be non-negative',

  // Database operation errors
  PROJECT_NOT_FOUND: 'Project not found or access denied',
  PARTITION_ERROR: 'Failed to insert event into partition',
} as const;
```

Add to `src/shared/constants/index.ts`:

```typescript
export * from './keys.constants';
export * from './locale.constants';
export * from './projects.constants';
export * from './telemetry.constants';
```

### Step 3: Create Zod Validation Schemas

Create `src/features/telemetry/api/telemetry.schemas.ts` with all validation schemas as defined in section 3.2.

### Step 4: Create Error Handling Utilities

Create `src/features/telemetry/api/telemetry.errors.ts`:

```typescript
import type { PostgrestError } from '@supabase/supabase-js';
import type { ApiErrorResponse } from '@/shared/types';
import { createApiErrorResponse } from '@/shared/utils';
import { TELEMETRY_PG_ERROR_CODES, TELEMETRY_ERROR_MESSAGES } from '@/shared/constants';

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors including:
 * - Check constraint violations (23514)
 * - Foreign key violations (23503)
 * - Partition errors
 *
 * @param error - PostgrestError from Supabase
 * @param context - Optional context string for logging (e.g., hook name)
 * @param fallbackMessage - Optional custom fallback message for generic errors
 * @returns Standardized ApiErrorResponse object
 */
export function createDatabaseErrorResponse(
  error: PostgrestError,
  context?: string,
  fallbackMessage?: string
): ApiErrorResponse {
  const logPrefix = context ? `[${context}]` : '[handleDatabaseError]';
  console.error(`${logPrefix} Database error:`, error);

  // handle check constraint violations (invalid enum value)
  if (error.code === TELEMETRY_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, TELEMETRY_ERROR_MESSAGES.INVALID_EVENT_NAME, { constraint: error.details });
  }

  // handle foreign key violations (project not found)
  if (error.code === TELEMETRY_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return createApiErrorResponse(404, TELEMETRY_ERROR_MESSAGES.PROJECT_NOT_FOUND);
  }

  // handle partition errors
  if (error.message.includes('partition') || error.message.includes('no partition')) {
    return createApiErrorResponse(500, TELEMETRY_ERROR_MESSAGES.PARTITION_ERROR, { original: error });
  }

  // generic database error
  return createApiErrorResponse(500, fallbackMessage || TELEMETRY_ERROR_MESSAGES.DATABASE_ERROR, { original: error });
}
```

### Step 5: Create Query Keys Factory

Create `src/features/telemetry/api/telemetry.key-factory.ts`:

```typescript
import type { TelemetryEventsParams } from '@/shared/types';

export const TELEMETRY_KEYS = {
  all: ['telemetry-events'] as const,
  list: (projectId: string, params?: TelemetryEventsParams) => [...TELEMETRY_KEYS.lists(), projectId, params] as const,
  lists: () => [...TELEMETRY_KEYS.all, 'list'] as const,
};
```

**Note:** The factory stays close to TanStack Query guidance (top-level `all`, `lists`, `list`) and provides a local params helper for clarity.

### Step 6: Create TanStack Query Hook

**Implementation Notes:**

- Only one hook needed: `useTelemetryEvents` for reading events
- No mutation hook needed (events created automatically by database)
- No optimistic updates needed (read-only, append-only data)
- Optional cache invalidation (telemetry is historical data)
- Include TypeScript generics for type safety

**6.1 Create `src/features/telemetry/api/useTelemetryEvents/useTelemetryEvents.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';

import type { ApiErrorResponse, TelemetryEventResponse, TelemetryEventsParams } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../telemetry.errors';
import { TELEMETRY_KEYS } from '../telemetry.key-factory';
import { LIST_TELEMETRY_EVENTS_SCHEMA, TELEMETRY_EVENT_RESPONSE_SCHEMA } from '../telemetry.schemas';

export function useTelemetryEvents(projectId: string, params?: TelemetryEventsParams) {
  const supabase = useSupabase();

  return useQuery<TelemetryEventResponse[], ApiErrorResponse>({
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      const { limit, offset, order, project_id } = LIST_TELEMETRY_EVENTS_SCHEMA.parse({
        project_id: projectId,
        ...params,
      });

      let query = supabase
        .from('telemetry_events')
        .select('*')
        .eq('project_id', project_id)
        .order('created_at', { ascending: order === 'created_at.asc' })
        .limit(limit);

      // add offset if provided
      if (offset && offset > 0) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw createDatabaseErrorResponse(error, 'useTelemetryEvents', 'Failed to fetch telemetry events');
      }

      return TELEMETRY_EVENT_RESPONSE_SCHEMA.array().parse(data || []);
    },
    queryKey: TELEMETRY_KEYS.list(projectId, params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**Note:** No mutation hook needed. Telemetry events are created automatically by database triggers and RPC functions.

### Step 7: Create API Index File

Create `src/features/telemetry/api/index.ts`:

```typescript
export { createDatabaseErrorResponse } from './telemetry.errors';
export { TELEMETRY_KEYS } from './telemetry.key-factory';
export * from './telemetry.schemas';
export * from './useTelemetryEvents';
```

**Organization:**

- Error utilities remain first for reuse across features
- `TELEMETRY_KEYS` exposes the TanStack Query key factory in a single place
- Zod schemas (`EVENT_NAME_SCHEMA`, `LIST_TELEMETRY_EVENTS_SCHEMA`, `TELEMETRY_EVENT_RESPONSE_SCHEMA`) re-export with shared-type parity
- Each schema uses `satisfies z.ZodType<...>` to lock runtime validation to the shared DTO contracts
- Hook barrels (`export * from './useTelemetryEvents'`) keep consumer imports concise
- Comments were removed to keep the barrel minimal and eslint-friendly

### Step 8: Write Unit Tests

**Testing Strategy:**

- Use Vitest with Testing Library for comprehensive test coverage
- Co-locate tests with source files (`Hook.test.ts` next to `Hook.ts`)
- Mock Supabase client using test utilities from `src/test/`
- Test both success and error scenarios with telemetry-specific edge cases
- Verify cache behavior, partitioning, and event property validation
- Aim for 90% coverage threshold as per project requirements

**8.1 Create `src/features/telemetry/api/useTelemetryEvents/useTelemetryEvents.test.ts`:**

Test scenarios:

- Successful list fetch with default params (100 limit, 0 offset, created_at.desc order)
- Successful list fetch with custom pagination (limit=50, offset=100)
- Successful list fetch with sorting (asc/desc)
- Empty results (no events yet for project)
- Validation error for invalid project ID (not UUID)
- Validation error for limit too high (> 1000)
- Validation error for negative offset
- Database error handling
- Multiple events with different event_name types
- RLS access denied (appears as empty array or error)

**Note:** No tests needed for event creation hook since it doesn't exist. Telemetry event creation is tested at the database level (trigger tests, RPC function tests).
