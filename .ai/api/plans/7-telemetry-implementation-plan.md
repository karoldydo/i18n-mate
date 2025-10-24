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

### 3.1 Existing Types

**Import Path:** `@/shared/types` (central export) or `@/shared/types/telemetry` (feature-specific)

**Shared Types** (from `src/shared/types/types.ts`):

- `PaginationParams` - Query parameters for pagination
- `PaginationMetadata` - Response metadata with total count
- `ApiErrorResponse` - Generic error response wrapper
- `ValidationErrorResponse` - 400 validation error response

- `EventType`: enum type representing telemetry event names ('project_created', 'language_added', 'key_created', 'translation_completed')
- `TelemetryEventResponse`: canonical telemetry event payload used across hooks
- `TelemetryEvent`: database table type from Supabase generated types
- `CreateTelemetryEventRequest`: input for event creation with event_name, project_id, and properties
- `ProjectCreatedProperties`: event properties containing locale_count
- `LanguageAddedProperties`: event properties containing locale code and locale_count
- `KeyCreatedProperties`: event properties containing full_key and key_count
- `TranslationCompletedProperties`: event properties containing completed_keys, failed_keys, mode, and target_locale
- `TelemetryEventProperties`: union type of all event-specific property types
- `TelemetryEventUnion`: union type of all complete telemetry event types
- `ProjectCreatedEvent`: complete event structure for project creation events
- `LanguageAddedEvent`: complete event structure for language addition events
- `KeyCreatedEvent`: complete event structure for key creation events
- `TranslationCompletedEvent`: complete event structure for translation completion events

- `EVENT_NAME_SCHEMA`: validates event names against allowed telemetry event types
- `LIST_TELEMETRY_EVENTS_SCHEMA`: validates list query parameters with limit, offset, order, and project_id constraints
- `TELEMETRY_EVENT_RESPONSE_SCHEMA`: runtime validation for telemetry event response payloads
- `ListTelemetryEventsParams`: interface extending pagination params with optional order and required project_id

## 4. Response Details

### 4.1 List Telemetry Events

**Success Response (200 OK):**

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

Zod validation errors are automatically converted to `ApiErrorResponse` format by the global `QueryClient` error handler configured in `src/app/config/queryClient/queryClient.ts`. This ensures consistent error format across all queries and mutations without requiring try/catch blocks in individual hooks.

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

Treat empty SELECT results as 404 to avoid leaking existence. Use `createDatabaseErrorResponse` function to map database errors to standardized `ApiErrorResponse` format.

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

List queries use `staleTime: 5 * 60 * 1000` and `gcTime: 10 * 60 * 1000` for telemetry events. No caching configured for mutations since events are append-only and created automatically.

**Cache Invalidation:**

Create event optionally invalidates list cache (usually not needed since events are historical). Consider not invalidating cache for background/automated events to reduce refetch load. Only invalidate if user action triggers event creation.

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

Create `src/shared/constants/telemetry.constants.ts` with centralized constants, patterns, and utilities for telemetry event types, pagination defaults, sorting options, PostgreSQL error codes, and error messages. Add to `src/shared/constants/index.ts` to export telemetry constants alongside other feature constants.

### Step 3: Create Zod Validation Schemas

Create `src/features/telemetry/api/telemetry.schemas.ts` with all validation schemas as defined in section 3.2.

### Step 4: Create Error Handling Utilities

Create `src/features/telemetry/api/telemetry.errors.ts` with `createDatabaseErrorResponse` function that maps PostgreSQL errors (check constraint violations, foreign key violations, partition errors) to standardized `ApiErrorResponse` objects with appropriate HTTP status codes and user-friendly messages.

### Step 5: Create Query Keys Factory

Create `src/features/telemetry/api/telemetry.key-factory.ts` with `TELEMETRY_KEYS` factory providing structured query keys for telemetry events following TanStack Query guidance with top-level `all`, `lists`, and `list` methods.

### Step 6: Create TanStack Query Hook

Create `useTelemetryEvents` hook for reading telemetry events with validation, error handling, and appropriate caching configuration. No mutation hook needed since telemetry events are created automatically by database triggers and RPC functions.

### Step 7: Create API Index File

Create `src/features/telemetry/api/index.ts` as barrel export for telemetry API components including error utilities, query key factory, validation schemas, and hooks.

### Step 8: Write Unit Tests

Write comprehensive unit tests for telemetry API using Vitest and Testing Library. Co-locate tests with source files, mock Supabase client, and test success/error scenarios including validation, pagination, sorting, and RLS access control. No tests needed for event creation since it happens automatically at database level.
