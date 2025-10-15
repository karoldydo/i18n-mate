# API Endpoint Implementation Plan: Telemetry Events

## 1. Endpoint Overview

The Telemetry Events API provides read and write operations for application telemetry data used for analytics and KPI tracking. The `telemetry_events` table is partitioned by month to handle large volumes of event data efficiently. Access is restricted to project owners or service_role for security. The CREATE endpoint is primarily intended for internal use by Edge Functions to record application events like project creation, language addition, key creation, and translation completion.

### Key Features

- Retrieve paginated telemetry events for a specific project
- Create new telemetry events with typed properties
- Automatic monthly partitioning for scalability
- RLS-based access control (owner or service_role only)
- Support for multiple event types with structured properties
- Future-ready for analytics dashboard integration

### Endpoints Summary

1. **Get Project Telemetry** - `GET /rest/v1/telemetry_events?project_id=eq.{project_id}&order=created_at.desc&limit=100`
2. **Create Telemetry Event** - `POST /rest/v1/telemetry_events`

## 2. Request Details

### 2.1 Get Project Telemetry

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/telemetry_events?project_id=eq.{project_id}&order=created_at.desc&limit=100`
- **Authentication:** Required (JWT via Authorization header, owner or service_role)
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project ID to filter events (via query filter `project_id=eq.{uuid}`)
  - Optional:
    - `limit` (number) - Number of events to return (default: 100, max: 1000)
    - `order` (string) - Sort order (default: `created_at.desc`, options: `created_at.asc`, `created_at.desc`)
    - `offset` (number) - Pagination offset (default: 0)
- **Request Body:** None

**Example Request:**

```http
GET /rest/v1/telemetry_events?project_id=eq.550e8400-e29b-41d4-a716-446655440000&order=created_at.desc&limit=100
Authorization: Bearer {access_token}
```

### 2.2 Create Telemetry Event

- **HTTP Method:** POST
- **URL Structure:** `/rest/v1/telemetry_events`
- **Authentication:** Required (service_role preferred for internal use)
- **Parameters:** None
- **Request Body:**

```json
{
  "event_name": "translation_completed",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "properties": {
    "completed_keys": 98,
    "failed_keys": 2,
    "mode": "all",
    "target_locale": "pl"
  }
}
```

**Field Validation:**

- `event_name` (required, event_type enum) - One of: `project_created`, `language_added`, `key_created`, `translation_completed`
- `project_id` (required, UUID) - Valid project ID that exists and user has access to
- `properties` (optional, JSONB) - Event-specific metadata, structure varies by event_name

**Event Type Specific Properties:**

1. **project_created:**

   ```json
   { "locale_count": 1 }
   ```

2. **language_added:**

   ```json
   { "locale": "pl", "locale_count": 2 }
   ```

3. **key_created:**

   ```json
   { "full_key": "app.home.title", "key_count": 50 }
   ```

4. **translation_completed:**
   ```json
   {
     "completed_keys": 98,
     "failed_keys": 2,
     "mode": "all",
     "target_locale": "pl"
   }
   ```

## 3. Used Types

### 3.1 Existing Types (from `src/shared/types/types.ts`)

```typescript
// Response DTOs
export type TelemetryEvent = Tables<'telemetry_events'>;
export type TelemetryEventResponse = TelemetryEvent;

// Request DTOs
export type CreateTelemetryEventRequest = Pick<TelemetryEventInsert, 'event_name' | 'project_id' | 'properties'>;

// Enum Types
export type EventType = Enums<'event_type'>;

// Property Types
export type TelemetryEventProperties =
  | ProjectCreatedProperties
  | LanguageAddedProperties
  | KeyCreatedProperties
  | TranslationCompletedProperties;

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
  mode: TranslationMode;
  target_locale: string;
}

// Pagination
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginationMetadata {
  end: number;
  start: number;
  total: number;
}

// Error types
export interface ApiErrorResponse {
  error: {
    code: string;
    details?: Record<string, unknown>;
    message: string;
  };
}

export interface ValidationErrorResponse extends ApiErrorResponse {
  error: {
    code: 'validation_error';
    details: {
      constraint: string;
      field: string;
    };
    message: string;
  };
}
```

### 3.2 New Types to Add

Add to `src/shared/types/types.ts`:

```typescript
/**
 * Get Telemetry Events Query Parameters
 */
export interface GetTelemetryEventsParams extends PaginationParams {
  order?: 'created_at.asc' | 'created_at.desc';
  project_id: string;
}
```

### 3.3 New Zod Validation Schemas

Create validation schemas in `src/features/telemetry/api/telemetry.schemas.ts`:

```typescript
import { z } from 'zod';

// Event type enum validation
const eventTypeSchema = z.enum(['project_created', 'language_added', 'key_created', 'translation_completed']);

// Translation mode enum validation
const translationModeSchema = z.enum(['all', 'missing_only']);

// BCP-47 locale code validation
const localeCodeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// Event-specific property schemas
const projectCreatedPropertiesSchema = z.object({
  locale_count: z.number().int().positive(),
});

const languageAddedPropertiesSchema = z.object({
  locale: localeCodeSchema,
  locale_count: z.number().int().positive(),
});

const keyCreatedPropertiesSchema = z.object({
  full_key: z
    .string()
    .regex(/^[a-z][a-z0-9._-]*$/, 'Key must start with lowercase letter and contain only [a-z0-9._-]')
    .refine((val) => !val.includes('..'), 'Key cannot contain consecutive dots')
    .refine((val) => !val.endsWith('.'), 'Key cannot end with a dot'),
  key_count: z.number().int().nonnegative(),
});

const translationCompletedPropertiesSchema = z.object({
  completed_keys: z.number().int().nonnegative(),
  failed_keys: z.number().int().nonnegative(),
  mode: translationModeSchema,
  target_locale: localeCodeSchema,
});

// Union schema for all property types
const telemetryEventPropertiesSchema = z.union([
  projectCreatedPropertiesSchema,
  languageAddedPropertiesSchema,
  keyCreatedPropertiesSchema,
  translationCompletedPropertiesSchema,
]);

// Get Telemetry Events Schema
export const getTelemetryEventsSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
  order: z.enum(['created_at.asc', 'created_at.desc']).optional().default('created_at.desc'),
});

// Create Telemetry Event Schema
export const createTelemetryEventSchema = z.object({
  event_name: eventTypeSchema,
  project_id: z.string().uuid('Invalid project ID format'),
  properties: telemetryEventPropertiesSchema.optional().nullable(),
});

// Helper function to validate properties match event_name
export function validateEventProperties(eventName: string, properties: unknown): z.ZodIssue | null {
  const schemas = {
    project_created: projectCreatedPropertiesSchema,
    language_added: languageAddedPropertiesSchema,
    key_created: keyCreatedPropertiesSchema,
    translation_completed: translationCompletedPropertiesSchema,
  };

  const schema = schemas[eventName as keyof typeof schemas];
  if (!schema) {
    return {
      code: 'custom',
      path: ['event_name'],
      message: `Unknown event type: ${eventName}`,
    };
  }

  const result = schema.safeParse(properties);
  if (!result.success) {
    return result.error.issues[0];
  }

  return null;
}
```

## 4. Response Details

### 4.1 Get Project Telemetry

**Success Response (200 OK):**

```json
[
  {
    "created_at": "2025-01-15T10:20:00Z",
    "event_name": "translation_completed",
    "id": "uuid",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "properties": {
      "completed_keys": 98,
      "failed_keys": 2,
      "mode": "all",
      "target_locale": "pl"
    }
  },
  {
    "created_at": "2025-01-15T09:15:00Z",
    "event_name": "key_created",
    "id": "uuid",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "properties": {
      "full_key": "app.home.title",
      "key_count": 50
    }
  }
]
```

**Headers:**

- `Content-Range: 0-99/150` - Pagination info (start-end/total)

### 4.2 Create Telemetry Event

**Success Response (201 Created):**

```json
{
  "created_at": "2025-01-15T10:20:00Z",
  "event_name": "translation_completed",
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "properties": {
    "completed_keys": 98,
    "failed_keys": 2,
    "mode": "all",
    "target_locale": "pl"
  }
}
```

### 4.3 Error Responses

**401 Unauthorized:**

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authentication required"
  }
}
```

**400 Bad Request (Validation Error):**

```json
{
  "error": {
    "code": "validation_error",
    "details": {
      "constraint": "enum",
      "field": "event_name"
    },
    "message": "Invalid event_name: must be one of [project_created, language_added, key_created, translation_completed]"
  }
}
```

**400 Bad Request (Property Mismatch):**

```json
{
  "error": {
    "code": "validation_error",
    "details": {
      "constraint": "type_mismatch",
      "field": "properties"
    },
    "message": "Properties do not match event type 'translation_completed'"
  }
}
```

**403 Forbidden:**

```json
{
  "error": {
    "code": "forbidden",
    "message": "Not authorized to access this project's telemetry"
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "not_found",
    "message": "Project not found"
  }
}
```

**500 Internal Server Error:**

```json
{
  "error": {
    "code": "internal_server_error",
    "message": "An unexpected error occurred"
  }
}
```

**500 Internal Server Error (Partition Missing):**

```json
{
  "error": {
    "code": "partition_error",
    "message": "No partition exists for the current date. Please contact support."
  }
}
```

## 5. Data Flow

### 5.1 Get Project Telemetry Flow

1. User navigates to analytics/telemetry page for a specific project
2. React component invokes `useGetTelemetryEvents` hook with project ID
3. Hook validates parameters using `getTelemetryEventsSchema`
4. Hook retrieves Supabase client from `useSupabase()` context
5. Client queries `telemetry_events` table with filters:
   - `.eq('project_id', validatedProjectId)`
   - `.order('created_at', { ascending: false })`
   - `.limit(validatedLimit)`
   - `.range(offset, offset + limit - 1)`
6. RLS policy `telemetry_events_select_policy` validates `owner_user_id = auth.uid()` OR `auth.role() = 'service_role'`
7. PostgreSQL router directs query to appropriate partition(s) based on created_at range
8. Results are returned with `Content-Range` header
9. TanStack Query caches results with 5-minute stale time
10. Component renders event list with formatted timestamps and properties

### 5.2 Create Telemetry Event Flow

1. Edge Function or internal service needs to log an event
2. Service calls `useCreateTelemetryEvent` mutation hook (or direct Supabase call for Edge Functions)
3. Hook validates data using `createTelemetryEventSchema`
4. Hook validates properties match event_name using `validateEventProperties`
5. If validation fails, return 400 error immediately (but don't block main flow)
6. Hook calls Supabase `.insert()` with validated data
7. Database:
   - Validates event_name matches event_type enum
   - Validates project_id FK constraint (project must exist)
   - Determines correct partition based on current timestamp
   - Inserts row into appropriate partition
8. RLS policy `telemetry_events_insert_policy` validates ownership or service_role
9. If no partition exists for current date, PostgreSQL raises error → hook returns 500
10. On success, new telemetry event is returned
11. TanStack Query invalidates related caches (optional, since telemetry is append-only)
12. Component continues with main flow (telemetry should never block UX)

### 5.3 Error Handling in Critical Paths

For telemetry creation in user-facing features:

1. Wrap telemetry calls in try-catch blocks
2. Log errors silently without showing to user
3. Use fire-and-forget pattern (don't await results)
4. Consider background queue for offline support
5. Implement exponential backoff for retries

**Example Pattern:**

```typescript
// Non-blocking telemetry
void createTelemetryEvent({
  event_name: 'key_created',
  project_id,
  properties: { full_key: newKey, key_count: totalKeys },
}).catch((error) => {
  console.error('[Telemetry] Failed to log key_created event:', error);
  // Silently fail - don't impact user flow
});
```

## 6. Security Considerations

### 6.1 Authentication

- All endpoints require valid JWT access token in `Authorization: Bearer {token}` header
- Token is obtained via Supabase Auth during sign-in
- Token is stored in Supabase client session and automatically included in requests
- Token expiration is handled by Supabase client with automatic refresh

### 6.2 Authorization

- Row-Level Security (RLS) policies enforce access control:
  - `telemetry_events_select_policy`: SELECT where `project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())` OR `auth.role() = 'service_role'`
  - `telemetry_events_insert_policy`: INSERT where `project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())` OR `auth.role() = 'service_role'`
- Users can only access telemetry for projects they own
- Service role can access all telemetry for internal operations
- RLS policies are defined in `supabase/migrations/20251013143400_create_rls_policies.sql`

### 6.3 Input Validation

- **Client-side validation:** Zod schemas validate all input before sending to backend
- **Database-level validation:**
  - event_name CHECK constraint (must be in event_type enum)
  - project_id FK constraint (must reference existing project)
  - properties JSONB validation (well-formed JSON)
- **Type-specific validation:** Properties structure must match event_name
- **Partition validation:** Automatic partition creation ensures data can be inserted

### 6.4 Data Isolation

- RLS policies prevent cross-user data leakage
- Partitioning provides logical and physical data separation by time
- Project ownership is validated via JOIN with projects table
- No direct access to other users' telemetry data

### 6.5 SQL Injection Prevention

- Supabase client uses parameterized queries for all operations
- Never construct raw SQL strings from user input
- JSONB properties are safely stored without interpretation
- Partition names are generated server-side, not from user input

### 6.6 Rate Limiting

- Supabase provides built-in rate limiting per IP address
- Consider application-level rate limiting for high-volume telemetry
- Use batching for multiple events to reduce request count
- Implement debouncing for frequent events (e.g., key changes)

### 6.7 Privacy Considerations

- Telemetry should not contain PII (personally identifiable information)
- Properties should only contain application metrics and metadata
- User emails, names, and sensitive data must not be logged
- Consider GDPR compliance for analytics data retention

### 6.8 Partition Management Security

- Automatic partition creation via cron job runs with elevated privileges
- Users cannot manually create or drop partitions
- Partition naming follows predictable pattern (telemetry_events_YYYY_MM)
- Old partitions can be archived/deleted for data retention compliance

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Invalid project_id format (not UUID)
- Invalid event_name (not in enum)
- Invalid properties structure for given event_name
- Invalid pagination parameters (limit > 1000, negative offset)
- Missing required fields

**Handling:**

```typescript
try {
  const validatedData = createTelemetryEventSchema.parse(eventData);

  // Additional validation for properties matching event_name
  const propertyError = validateEventProperties(validatedData.event_name, validatedData.properties);
  if (propertyError) {
    return {
      error: {
        code: 'validation_error',
        message: propertyError.message,
        details: {
          field: propertyError.path.join('.'),
          constraint: propertyError.code,
        },
      },
    };
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    return {
      error: {
        code: 'validation_error',
        message: error.errors[0].message,
        details: {
          field: error.errors[0].path.join('.'),
          constraint: error.errors[0].code,
        },
      },
    };
  }
}
```

### 7.2 Authentication Errors (401)

**Trigger Conditions:**

- Missing Authorization header
- Expired JWT token
- Invalid JWT signature
- Revoked token

**Handling:**

- Supabase client automatically handles token refresh
- If refresh fails, redirect user to login page
- Display "Session expired, please log in again" message
- For telemetry creation, fail silently in background

### 7.3 Authorization Errors (403)

**Trigger Conditions:**

- User attempts to access telemetry for project they don't own
- Non-service-role user attempts bulk telemetry operations
- RLS policy denies access

**Handling:**

```typescript
const { data, error } = await supabase
  .from('telemetry_events')
  .select('*')
  .eq('project_id', projectId);

if (error && error.code === 'PGRST301') {
  // RLS policy denied access
  return {
    error: {
      code: 'forbidden',
      message: 'Not authorized to access this project's telemetry',
    },
  };
}
```

### 7.4 Not Found Errors (404)

**Trigger Conditions:**

- Project ID doesn't exist
- Project was deleted
- Empty result set from query

**Handling:**

- For GET: Return empty array `[]` (Supabase convention)
- For POST: Catch FK constraint violation and return 404

```typescript
const { data, error } = await supabase.from('telemetry_events').insert(validatedData).select();

if (error && error.code === '23503') {
  // Foreign key violation - project doesn't exist
  return {
    error: {
      code: 'not_found',
      message: 'Project not found',
    },
  };
}
```

### 7.5 Partition Errors (500)

**Trigger Conditions:**

- No partition exists for current date
- Partition creation automation failed
- Date falls outside existing partition ranges

**Handling:**

```typescript
const { data, error } = await supabase.from('telemetry_events').insert(validatedData).select();

if (error && error.message.includes('no partition')) {
  console.error('[Telemetry] Partition missing:', error);

  // Alert operations team
  if (import.meta.env.PROD) {
    notifyOperationsTeam('telemetry_partition_missing', { error });
  }

  return {
    error: {
      code: 'partition_error',
      message: 'No partition exists for the current date. Please contact support.',
    },
  };
}
```

### 7.6 Server Errors (500)

**Trigger Conditions:**

- Database connection failure
- Unexpected database constraint violation
- Partition routing failure
- JSONB parse errors

**Handling:**

- Log full error details to console (development) or error tracking service (production)
- Return generic message to user: "Failed to record telemetry event"
- For critical flows, fail silently without blocking user

```typescript
const { data, error } = await supabase.from('telemetry_events').insert(validatedData).select();

if (error) {
  console.error('[Telemetry] Insert error:', error);

  // Send to error tracking (e.g., Sentry)
  if (import.meta.env.PROD) {
    trackError(error, { context: 'telemetry_creation', eventName: validatedData.event_name });
  }

  // Don't throw in critical paths - telemetry should never block UX
  if (options.silent) {
    return null;
  }

  return {
    error: {
      code: 'internal_server_error',
      message: 'Failed to record telemetry event',
    },
  };
}
```

### 7.7 Network Errors

**Trigger Conditions:**

- Lost internet connection
- Supabase service unavailable
- Request timeout

**Handling:**

- TanStack Query automatically retries failed requests (3 retries with exponential backoff)
- For GET: Display network error message with retry button
- For POST: Queue events locally and retry when connection restored
- Consider using service workers for offline support

### 7.8 Graceful Degradation

**Principle:** Telemetry should NEVER break user experience

```typescript
// Good: Fire-and-forget pattern
void logTelemetryEvent(eventData).catch(console.error);

// Bad: Blocking user flow
await logTelemetryEvent(eventData); // ❌ Don't do this
```

**Implementation Pattern:**

```typescript
export function useCreateTelemetryEvent(options: { silent?: boolean } = {}) {
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async (eventData: CreateTelemetryEventRequest) => {
      try {
        const validated = createTelemetryEventSchema.parse(eventData);
        const { data, error } = await supabase.from('telemetry_events').insert(validated).select();

        if (error) throw error;
        return data;
      } catch (error) {
        if (options.silent) {
          console.warn('[Telemetry] Silent failure:', error);
          return null;
        }
        throw error;
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

## 8. Performance Considerations

### 8.1 Query Optimization

**Indexing:**

- Primary key index on `(id, created_at)` for partitioned table (auto-created)
- Index on `project_id` for fast filtering by project (defined in `supabase/migrations/20251013143200_create_indexes.sql`)
- Index on `created_at` for efficient time-based ordering and partition pruning
- Partial indexes on frequently queried event_name values (future optimization)

**Partition Pruning:**

- PostgreSQL automatically prunes irrelevant partitions based on `created_at` filter
- Queries with date ranges only scan relevant monthly partitions
- Significantly reduces I/O for time-bound queries

**Pagination:**

- Use `limit` and `offset` for pagination
- Default limit of 100 balances UX and performance
- Max limit of 1000 prevents excessive data transfer
- Consider cursor-based pagination for large datasets (future enhancement)

### 8.2 Partitioning Strategy

**Monthly Partitions:**

- Each partition covers one month: `FOR VALUES FROM ('2025-01-01') TO ('2025-02-01')`
- Automatic partition creation via cron job (defined in `supabase/migrations/20251013143600_setup_telemetry_partition_automation.sql`)
- Partitions are created 1 month in advance to prevent insert failures
- Old partitions can be detached and archived after retention period

**Benefits:**

- Bounded partition size prevents table bloat
- Efficient archival and deletion of old data
- Improved query performance through partition pruning
- Parallel query execution across partitions

**Considerations:**

- Cross-partition queries (spanning multiple months) are slower
- Partition creation must stay ahead of current date
- Monitor partition creation automation for failures

### 8.3 Caching Strategy

**TanStack Query Configuration:**

```typescript
// Get telemetry events: 5-minute cache
staleTime: 5 * 60 * 1000,
gcTime: 10 * 60 * 1000,

// Telemetry is append-only, so aggressive caching is safe
// Only invalidate on explicit user refresh or new events in current view
```

**Cache Invalidation:**

- Create event → optionally invalidate list cache (only if in current view)
- Telemetry is append-only, so no need to invalidate on updates/deletes
- Use polling or real-time subscriptions for live dashboards (future enhancement)

### 8.4 Write Performance

**Batch Inserts:**

```typescript
// Instead of multiple single inserts
await supabase.from('telemetry_events').insert([event1, event2, event3]);
```

**Async/Non-Blocking:**

- Use fire-and-forget pattern for non-critical telemetry
- Queue events in memory and batch insert periodically
- Use web workers or service workers for background processing

**Debouncing:**

```typescript
// Debounce frequent events
const debouncedLogEvent = useDebounce(logTelemetryEvent, 1000);
```

### 8.5 Payload Size

- Typical single event: ~200-500 bytes (depends on properties)
- 100 events response: ~20-50 KB
- Properties should be minimal and focused
- Avoid storing large objects in properties (use references instead)
- Compression (gzip) enabled by default in Supabase

### 8.6 Database Maintenance

**Partition Maintenance:**

- Monitor partition creation automation
- Alert if partitions are not created 1 month ahead
- Regularly review and archive old partitions

**Index Maintenance:**

- PostgreSQL auto-vacuum handles index maintenance
- Monitor bloat on heavily-written partitions
- Consider REINDEX for old partitions before archival

**Data Retention:**

- Define retention policy (e.g., 12 months)
- Automate archival of old partitions to cold storage
- Drop archived partitions to free space

```sql
-- Example: Archive partition older than 12 months
ALTER TABLE telemetry_events DETACH PARTITION telemetry_events_2024_01;
-- Export data to S3 or other cold storage
-- Then drop the partition
DROP TABLE telemetry_events_2024_01;
```

### 8.7 Monitoring and Alerts

**Key Metrics:**

- Telemetry event creation rate (events/minute)
- Query latency for GET endpoint (p50, p95, p99)
- Partition creation automation success rate
- Failed telemetry events count
- Partition disk usage

**Alerts:**

- Partition creation failed
- Partition does not exist for current date
- Telemetry insert error rate > 5%
- Query latency > 1 second (p95)
- Partition disk usage > 80%

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

```bash
mkdir -p src/features/telemetry/{api,components,hooks}
```

### Step 2: Add New Types to Shared Types

Update `src/shared/types/types.ts` to add `GetTelemetryEventsParams` interface (section 3.2).

### Step 3: Create Zod Validation Schemas

Create `src/features/telemetry/api/telemetry.schemas.ts` with all validation schemas defined in section 3.3.

### Step 4: Create TanStack Query Hooks

**4.1 Create `src/features/telemetry/api/useGetTelemetryEvents.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { getTelemetryEventsSchema } from './telemetry.schemas';
import type { GetTelemetryEventsParams, TelemetryEventResponse, ApiError } from '@/shared/types';

export const telemetryKeys = {
  all: ['telemetry'] as const,
  lists: () => [...telemetryKeys.all, 'list'] as const,
  list: (params: GetTelemetryEventsParams) => [...telemetryKeys.lists(), params] as const,
};

export function useGetTelemetryEvents(params: GetTelemetryEventsParams) {
  const supabase = useSupabase();

  return useQuery<TelemetryEventResponse[], ApiError>({
    queryKey: telemetryKeys.list(params),
    queryFn: async () => {
      // Validate parameters
      const validated = getTelemetryEventsSchema.parse(params);

      const { data, error } = await supabase
        .from('telemetry_events')
        .select('*')
        .eq('project_id', validated.project_id)
        .order('created_at', { ascending: validated.order === 'created_at.asc' })
        .range(validated.offset, validated.offset + validated.limit - 1);

      if (error) {
        console.error('[useGetTelemetryEvents] Query error:', error);

        // Check for RLS policy denial
        if (error.code === 'PGRST301') {
          throw {
            error: {
              code: 'forbidden',
              message: 'Not authorized to access this project's telemetry',
            },
          };
        }

        throw {
          error: {
            code: 'database_error',
            message: 'Failed to fetch telemetry events',
            details: { original: error },
          },
        };
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
```

**4.2 Create `src/features/telemetry/api/useCreateTelemetryEvent.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createTelemetryEventSchema, validateEventProperties } from './telemetry.schemas';
import { telemetryKeys } from './useGetTelemetryEvents';
import type { CreateTelemetryEventRequest, TelemetryEventResponse, ApiError } from '@/shared/types';

export interface CreateTelemetryEventOptions {
  /**
   * If true, errors will be logged but not thrown
   * Useful for non-critical telemetry that shouldn't block user flows
   */
  silent?: boolean;
}

export function useCreateTelemetryEvent(options: CreateTelemetryEventOptions = {}) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<TelemetryEventResponse | null, ApiError, CreateTelemetryEventRequest>({
    mutationFn: async (eventData) => {
      try {
        // Validate input
        const validated = createTelemetryEventSchema.parse(eventData);

        // Validate properties match event_name
        const propertyError = validateEventProperties(validated.event_name, validated.properties);
        if (propertyError) {
          throw {
            error: {
              code: 'validation_error',
              message: `Properties do not match event type '${validated.event_name}': ${propertyError.message}`,
              details: {
                field: propertyError.path.join('.'),
                constraint: 'type_mismatch',
              },
            },
          };
        }

        // Insert event
        const { data, error } = await supabase.from('telemetry_events').insert(validated).select().single();

        if (error) {
          console.error('[useCreateTelemetryEvent] Insert error:', error);

          // Handle foreign key violation (project doesn't exist)
          if (error.code === '23503') {
            throw {
              error: {
                code: 'not_found',
                message: 'Project not found',
              },
            };
          }

          // Handle partition missing error
          if (error.message.includes('no partition')) {
            console.error('[useCreateTelemetryEvent] CRITICAL: Partition missing for current date');

            // Alert operations team in production
            if (import.meta.env.PROD) {
              console.error('[useCreateTelemetryEvent] Partition error requires immediate attention');
            }

            throw {
              error: {
                code: 'partition_error',
                message: 'No partition exists for the current date. Please contact support.',
              },
            };
          }

          // Generic error
          throw {
            error: {
              code: 'internal_server_error',
              message: 'Failed to record telemetry event',
              details: { original: error },
            },
          };
        }

        return data;
      } catch (error) {
        // Silent mode: log and return null instead of throwing
        if (options.silent) {
          console.warn('[useCreateTelemetryEvent] Silent failure:', error);
          return null;
        }
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Only invalidate cache if event was successfully created
      if (data) {
        queryClient.invalidateQueries({
          queryKey: telemetryKeys.list({ project_id: variables.project_id }),
        });
      }
    },
    retry: options.silent ? 3 : 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

### Step 5: Create Helper Hook for Fire-and-Forget Telemetry

**Create `src/features/telemetry/hooks/useTelemetryLogger.ts`:**

```typescript
import { useCallback } from 'react';
import { useCreateTelemetryEvent } from '../api/useCreateTelemetryEvent';
import type { CreateTelemetryEventRequest } from '@/shared/types';

/**
 * Hook for fire-and-forget telemetry logging
 * Errors are logged but never thrown
 * Ideal for non-critical telemetry in user-facing flows
 */
export function useTelemetryLogger() {
  const { mutateAsync } = useCreateTelemetryEvent({ silent: true });

  const logEvent = useCallback(
    (eventData: CreateTelemetryEventRequest) => {
      // Fire-and-forget: don't await, don't block
      void mutateAsync(eventData).catch((error) => {
        // Already logged in mutation, but add context here
        console.warn('[TelemetryLogger] Failed to log event:', eventData.event_name, error);
      });
    },
    [mutateAsync]
  );

  return { logEvent };
}
```

### Step 6: Create API Index File

Create `src/features/telemetry/api/index.ts`:

```typescript
export { useGetTelemetryEvents, telemetryKeys } from './useGetTelemetryEvents';
export { useCreateTelemetryEvent } from './useCreateTelemetryEvent';
export * from './telemetry.schemas';
```

### Step 7: Write Unit Tests

**7.1 Create `src/features/telemetry/api/useGetTelemetryEvents.test.ts`:**

Test scenarios:

- Successful fetch with default params
- Successful fetch with custom pagination
- Successful fetch with ascending order
- Validation error for invalid project_id format
- Validation error for limit > 1000
- Empty result set (no events)
- Forbidden error (RLS policy denial)
- Database error handling
- Cache behavior

**7.2 Create `src/features/telemetry/api/useCreateTelemetryEvent.test.ts`:**

Test scenarios:

- Successful event creation (each event type)
- Validation error for invalid event_name
- Validation error for property mismatch (wrong properties for event type)
- Project not found (FK violation)
- Partition missing error
- Silent mode: errors logged but not thrown
- Retry behavior on transient failures
- Cache invalidation after successful creation

**7.3 Create `src/features/telemetry/hooks/useTelemetryLogger.test.ts`:**

Test scenarios:

- Fire-and-forget: logEvent doesn't throw
- Fire-and-forget: logEvent doesn't block
- Errors are logged to console
- Multiple rapid calls are handled

### Step 8: Create Example Components

**8.1 Create `src/features/telemetry/components/TelemetryEventList.tsx`:**

Component that displays telemetry events for a project with:

- Formatted timestamps
- Event type badges
- Collapsible properties JSON
- Pagination controls
- Loading and error states

**8.2 Create `src/features/telemetry/components/EventPropertyDisplay.tsx`:**

Component that renders event properties in a user-friendly format:

- Type-specific formatting (e.g., "Completed 98 keys, failed 2")
- Locale codes with flags
- Key counts and other metrics
- Expandable JSON view

### Step 9: Integration with Existing Features

**9.1 Add telemetry to project creation:**

Update `src/features/projects/api/useCreateProject.ts`:

```typescript
import { useTelemetryLogger } from '@/features/telemetry/hooks/useTelemetryLogger';

export function useCreateProject() {
  const { logEvent } = useTelemetryLogger();

  return useMutation({
    mutationFn: async (projectData) => {
      // ... existing project creation logic ...
      return newProject;
    },
    onSuccess: (newProject) => {
      // Log telemetry event (fire-and-forget)
      logEvent({
        event_name: 'project_created',
        project_id: newProject.id,
        properties: {
          locale_count: 1, // Default locale is always created
        },
      });

      // ... existing cache invalidation ...
    },
  });
}
```

**9.2 Add telemetry to language addition:**

Update locale creation hooks similarly.

**9.3 Add telemetry to key creation:**

Update key creation hooks similarly.

**9.4 Add telemetry to translation jobs:**

Translation job completion already creates telemetry via Edge Function.

### Step 10: Create Route Components (Optional - Future Feature)

**10.1 Create `src/features/telemetry/routes/TelemetryPage.tsx`:**

Page component for analytics dashboard showing:

- Event timeline
- Event type distribution
- Key metrics and KPIs
- Date range filters

**10.2 Register routes (when analytics dashboard is implemented):**

Update `src/app/routes.ts`:

```typescript
{
  path: '/projects/:projectId/analytics',
  lazy: () => import('@/features/telemetry/routes/TelemetryPage'),
},
```

### Step 11: Add Component Tests

Write tests for components using Testing Library:

- TelemetryEventList renders events correctly
- Pagination controls work
- Event properties are formatted correctly
- Loading and error states display properly

### Step 12: Database Migration Verification

**12.1 Verify partitions exist:**

```sql
-- Check existing partitions
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'telemetry_events_%'
ORDER BY tablename;
```

**12.2 Verify partition automation:**

```sql
-- Check cron job for partition creation
SELECT * FROM cron.job WHERE jobname LIKE '%telemetry%';
```

**12.3 Test partition creation manually:**

```sql
-- Manually create partition for testing
SELECT create_monthly_partitions('telemetry_events', '2025-06-01', '2025-07-01');
```

### Step 13: Performance Testing

**13.1 Insert Performance:**

- Create 10,000 test events
- Measure insert latency (should be < 10ms per event)
- Verify batch inserts are faster than individual inserts

**13.2 Query Performance:**

- Query 1,000 events with pagination
- Measure query latency (should be < 100ms)
- Verify partition pruning works (use EXPLAIN ANALYZE)

**13.3 Cross-Partition Query:**

- Query events spanning multiple months
- Verify performance is acceptable (< 500ms)

### Step 14: Documentation

**14.1 Add JSDoc comments to all hooks**

**14.2 Create `src/features/telemetry/README.md`:**

Document:

- Feature overview
- Available hooks and their usage
- Event types and properties
- Best practices for telemetry logging
- Fire-and-forget pattern examples
- Silent mode vs. explicit error handling

**14.3 Update main project documentation:**

Add telemetry section to main README explaining:

- What telemetry is tracked
- How to add new event types
- Privacy considerations
- Data retention policy

### Step 15: Monitoring Setup

**15.1 Create monitoring dashboard:**

- Event creation rate chart
- Failed events chart
- Partition status indicator
- Query latency histogram

**15.2 Set up alerts:**

- Partition creation failed
- Partition missing for current date
- Telemetry insert error rate > 5%
- Query latency > 1 second (p95)

### Step 16: Accessibility Review

- Ensure telemetry UI components have proper ARIA labels
- Test keyboard navigation for event list
- Verify screen reader compatibility
- Check focus management

### Step 17: Final Review and Deployment

- Run `npm run lint` and fix any issues
- Run `npm run test` and ensure 100% coverage for API layer
- Test fire-and-forget pattern in various scenarios
- Verify telemetry doesn't impact user experience
- Create pull request with comprehensive description
- Request code review from team members
- Merge and deploy to staging environment
- Monitor for partition creation and event logging
- Monitor error tracking for any production issues
