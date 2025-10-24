# API Endpoint Implementation Plan: Translation Jobs

## 1. Endpoint Overview

The Translation Jobs API provides comprehensive management of LLM-powered translation jobs. It consists of five endpoints that handle checking active jobs, listing job history, creating new translation jobs via Edge Functions, cancelling running jobs, and retrieving detailed item-level status. The API integrates deeply with OpenRouter.ai for LLM translation services and includes robust progress tracking and error handling.

### Key Features

- Active job detection with fast polling support via indexed lookups
- Asynchronous job execution using Supabase Edge Functions with OpenRouter.ai integration
- Comprehensive job history with pagination and filtering by status
- Real-time progress tracking with per-key status and error reporting
- Graceful cancellation with preservation of partial results
- **Centralized constants and validation patterns** for consistency between TypeScript and PostgreSQL constraints

### Endpoints Summary

1. **Check Active Job** - `GET /rest/v1/translation_jobs?project_id=eq.{project_id}&status=in.(pending,running)&limit=1`
2. **List Translation Jobs** - `GET /rest/v1/translation_jobs?project_id=eq.{project_id}&order=created_at.desc&limit=50`
3. **Create Translation Job** - `POST /functions/v1/translate`
4. **Cancel Translation Job** - `PATCH /rest/v1/translation_jobs?id=eq.{job_id}`
5. **Get Job Items** - `GET /rest/v1/translation_job_items?job_id=eq.{job_id}&select=*,keys(full_key)`

## 2. Request Details

### 2.1 Check Active Job

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/translation_jobs?project_id=eq.{project_id}&status=in.(pending,running)&limit=1`
- **Authentication:** Required (JWT via Authorization header)
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project ID (via query filter)
  - Optional: None (status and limit are hardcoded for optimization)
- **Request Body:** None

### 2.2 List Translation Jobs

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/translation_jobs?project_id=eq.{project_id}&order=created_at.desc&limit=50`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project ID (via query filter)
  - Optional:
    - `limit` (number) - Items per page (default: 20, max: 100)
    - `offset` (number) - Pagination offset (default: 0)
    - `status` (JobStatus or JobStatus[]) - Filter by job status
    - `order` (string) - Sort order (default: `created_at.desc`)
- **Request Body:** None

### 2.3 Create Translation Job

- **HTTP Method:** POST
- **URL Structure:** `/functions/v1/translate`
- **Authentication:** Required
- **Parameters:** None
- **Request Body:**

```json
{
  "key_ids": [],
  "mode": "all",
  "params": {
    "max_tokens": 256,
    "temperature": 0.3
  },
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "target_locale": "pl"
}
```

**Field Validation:**

- `project_id` (required, UUID) - Project ID, must be owned by user
- `target_locale` (required, string) - BCP-47 locale code, must exist in project, cannot be default locale
- `mode` (required, enum) - Translation mode: `all`, `selected`, `single`
- `key_ids` (required for selected/single modes, array) - Array of key UUIDs to translate
- `params` (optional, object) - LLM parameters (temperature, max_tokens, model, provider)

### 2.4 Cancel Translation Job

- **HTTP Method:** PATCH
- **URL Structure:** `/rest/v1/translation_jobs?id=eq.{job_id}`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `id` (UUID) - Job ID (via query filter)
- **Request Body:**

```json
{
  "status": "cancelled"
}
```

**Field Validation:**

- `status` (required, literal) - Must be exactly `"cancelled"`
- Job must be in `pending` or `running` state to be cancellable

### 2.5 Get Job Items

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/translation_job_items?job_id=eq.{job_id}&select=*,keys(full_key)`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `job_id` (UUID) - Job ID (via query filter)
  - Optional:
    - `status` (ItemStatus) - Filter by item status (pending, completed, failed, skipped)
    - `limit` (number) - Items per page (default: 100, max: 1000)
    - `offset` (number) - Pagination offset (default: 0)
- **Request Body:** None

## 3. Used Types

**Note:** As of the latest refactoring, all types are organized by feature in separate directories under `src/shared/types/`.

### 3.1 Existing Types

**Import Path:** `@/shared/types` (central export) or `@/shared/types/translation-jobs` (feature-specific)

**Shared Types** (from `src/shared/types/types.ts`):

- `PaginationParams` - Query parameters for pagination
- `PaginationMetadata` - Response metadata with total count
- `PaginatedResponse<T>` - Generic paginated response wrapper
- `ApiErrorResponse` - Generic error response wrapper
- `ValidationErrorResponse` - 400 validation error response
- `ConflictErrorResponse` - 409 conflict error response

**Translation Jobs Types** (from `src/shared/types/translation-jobs/index.ts`):

- `TranslationJobResponse`, `TranslationJobItemResponse` (includes `keys.full_key`) define canonical payloads for lists and details.
- `CreateTranslationJobRequest`, `CreateTranslationJobResponse` capture job creation input/output and `job_id` for tracking.
- `CancelTranslationJobRequest`, `CancelTranslationJobRpcArgs` describe cancellation inputs and allowed status literal.
- `ListTranslationJobsParams` extends `PaginationParams` with `project_id` and optional `status` filter (single or array).
- `TranslationJobParams` defines optional LLM settings: `max_tokens`, `temperature`, `model`, `provider`.
- Enums `JobStatus`, `ItemStatus`, `TranslationMode` mirror DB enum domains and gate allowed transitions.

### 3.2 New Zod Validation Schemas

Schemas are defined in `src/features/translation-jobs/api/translation-jobs.schemas.ts` and mirror DB rules using shared constants.

- IDs/locales: `JOB_ID_SCHEMA`, `PROJECT_ID_SCHEMA`, `KEY_IDS_SCHEMA`, `LOCALE_CODE_SCHEMA` validate formats and lengths.
- Enums: `TRANSLATION_MODE_SCHEMA`, `JOB_STATUS_SCHEMA`, `ITEM_STATUS_SCHEMA` restrict values to allowed domains.
- Queries: `TRANSLATION_JOB_PARAMS_SCHEMA`, `CHECK_ACTIVE_JOB_SCHEMA`, `LIST_TRANSLATION_JOBS_SCHEMA` enforce bounds and defaults.
- Mutations: `CREATE_TRANSLATION_JOB_SCHEMA`, `CANCEL_TRANSLATION_JOB_SCHEMA`, `GET_JOB_ITEMS_SCHEMA` validate mode rules and pagination.
- Responses: `TRANSLATION_JOB_RESPONSE_SCHEMA`, `TRANSLATION_JOB_ITEM_RESPONSE_SCHEMA`, `CREATE_TRANSLATION_JOB_RESPONSE_SCHEMA` ensure runtime payloads are typed and safe.

## 4. Response Details

### 4.1 Check Active Job

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "completed_keys": 45,
      "created_at": "2025-01-15T10:15:00Z",
      "failed_keys": 2,
      "finished_at": null,
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "mode": "all",
      "model": null,
      "params": null,
      "project_id": "550e8400-e29b-41d4-a716-446655440001",
      "provider": null,
      "source_locale": "en",
      "started_at": "2025-01-15T10:15:00Z",
      "status": "running",
      "target_locale": "pl",
      "total_keys": 100,
      "updated_at": "2025-01-15T10:15:00Z"
    }
  ],
  "metadata": {
    "end": 0,
    "start": 0,
    "total": 1
  }
}
```

**Empty data array if no active job:**

```json
{
  "data": [],
  "metadata": {
    "end": -1,
    "start": 0,
    "total": 0
  }
}
```

### 4.2 List Translation Jobs

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "completed_keys": 98,
      "created_at": "2025-01-15T10:00:00Z",
      "failed_keys": 2,
      "finished_at": "2025-01-15T10:05:00Z",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "mode": "all",
      "model": "google/gemini-2.5-flash-lite",
      "params": {
        "max_tokens": 256,
        "temperature": 0.3
      },
      "project_id": "550e8400-e29b-41d4-a716-446655440001",
      "provider": "openrouter",
      "source_locale": "en",
      "started_at": "2025-01-15T10:00:00Z",
      "status": "completed",
      "target_locale": "pl",
      "total_keys": 100,
      "updated_at": "2025-01-15T10:05:00Z"
    }
  ],
  "metadata": {
    "end": 0,
    "start": 0,
    "total": 1
  }
}
```

### 4.3 Create Translation Job

**Success Response (202 Accepted):**

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Translation job created",
  "status": "pending"
}
```

### 4.4 Cancel Translation Job

**Success Response (200 OK):**

```json
{
  "finished_at": "2025-01-15T10:18:00Z",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "cancelled"
}
```

### 4.5 Get Job Items

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "created_at": "2025-01-15T10:15:00Z",
      "error_code": null,
      "error_message": null,
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "job_id": "550e8400-e29b-41d4-a716-446655440000",
      "key_id": "550e8400-e29b-41d4-a716-446655440003",
      "keys": {
        "full_key": "app.home.title"
      },
      "status": "completed",
      "updated_at": "2025-01-15T10:16:00Z"
    },
    {
      "created_at": "2025-01-15T10:15:00Z",
      "error_code": "rate_limit",
      "error_message": "Rate limit exceeded",
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "job_id": "550e8400-e29b-41d4-a716-446655440000",
      "key_id": "550e8400-e29b-41d4-a716-446655440005",
      "keys": {
        "full_key": "app.home.subtitle"
      },
      "status": "failed",
      "updated_at": "2025-01-15T10:17:00Z"
    }
  ],
  "metadata": {
    "end": 1,
    "start": 0,
    "total": 2
  }
}
```

### 4.6 Error Responses

All error responses follow the structure: `{ data: null, error: { code, message, details? } }`

**400 Bad Request (Invalid target locale):**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "details": {
      "constraint": "exists",
      "field": "target_locale"
    },
    "message": "Target locale does not exist in project"
  }
}
```

**400 Bad Request (Target locale is default):**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "details": {
      "constraint": "custom",
      "field": "target_locale"
    },
    "message": "Target locale cannot be the default locale"
  }
}
```

**400 Bad Request (Invalid mode):**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "details": {
      "constraint": "enum",
      "field": "mode"
    },
    "message": "Mode must be one of: all, selected, single"
  }
}
```

**400 Bad Request (Job not cancellable):**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "message": "Job is not in a cancellable state"
  }
}
```

**409 Conflict (Active job exists):**

```json
{
  "data": null,
  "error": {
    "code": 409,
    "message": "Another translation job is already active for this project"
  }
}
```

**404 Not Found:**

```json
{
  "data": null,
  "error": {
    "code": 404,
    "message": "Translation job not found or access denied"
  }
}
```

## 5. Data Flow

### 5.1 Check Active Job Flow

1. User requests active job status (e.g., for polling during translation)
2. TanStack Query hook (`useActiveTranslationJob`) is invoked with project ID
3. Hook validates project ID using Zod schema
4. Hook retrieves Supabase client from `useSupabase()` context
5. Client queries `translation_jobs` table with filters: `project_id=eq.{id}&status=in.(pending,running)&limit=1`
6. RLS policy filters results by project ownership through foreign key relationship
7. PostgreSQL uses `idx_translation_jobs_project_status` index for fast lookup
8. Results are returned as array (empty if no active job)
9. Hook returns array directly (no metadata needed for single-item lookup)
10. Component handles empty array vs populated array for UI state

### 5.2 List Translation Jobs Flow

1. User navigates to translation history page
2. React component invokes `useTranslationJobs` hook with project ID and optional filters
3. Hook validates params using Zod schema
4. Hook calls Supabase client with filters, sorting, and pagination
5. RLS policy validates project ownership
6. PostgreSQL executes query with `ORDER BY created_at DESC` and pagination
7. Results are returned with `count` from Supabase for pagination metadata
8. Hook constructs response with data array and pagination metadata
9. TanStack Query caches results with project-specific key
10. Component renders job history with pagination controls

### 5.3 Create Translation Job Flow

1. User submits translation request form
2. `useCreateTranslationJob` mutation hook receives form data
3. Hook validates data using `CREATE_TRANSLATION_JOB_SCHEMA` with mode-specific rules
4. If validation fails, return 400 error immediately
5. Hook calls Supabase Edge Function `/functions/v1/translate` with validated data
6. Edge Function performs server-side validation and business logic:
   - Validates project ownership and target locale existence
   - Checks for active jobs (409 conflict prevention)
   - Applies rate‑limiting checks (per‑project jobs/minute and per‑user concurrent jobs across owned projects)
   - Creates `translation_jobs` record with `status = 'pending'`
   - Creates `translation_job_items` records for each key
   - Begins asynchronous LLM translation process
7. For each key in background:
   - Fetches source value from default locale
   - Calls OpenRouter API with context and LLM params
   - Parses response and validates translation (max 250 chars, no newlines)
   - Updates `translations` record with translated value
   - Updates `translation_job_items` status and counters
8. Edge Function returns 202 with job ID immediately (doesn't wait for completion)
9. TanStack Query invalidates active job cache
10. Component begins polling active job status using exponential backoff (2s, 2s, 3s, 5s, 5s)

### 5.4 Cancel Translation Job Flow

1. User clicks cancel button on active job
2. `useCancelTranslationJob` mutation hook receives job ID
3. Hook validates job ID using UUID schema
4. Hook calls Supabase `.update()` with `status: 'cancelled'` and `.eq('id', job_id)`
5. Database trigger checks if job is in cancellable state (pending/running)
6. If job is not cancellable, trigger raises exception → hook returns 400
7. RLS policy validates ownership through project foreign key
8. If unauthorized or not found, Supabase returns empty result → hook returns 404
9. On success, job status is updated to 'cancelled' and `finished_at` is set
10. Edge Function checks cancellation flag between API calls and stops processing
11. TanStack Query updates cache and invalidates related queries
12. Component stops polling and shows cancelled status

### 5.5 Get Job Items Flow

1. User navigates to detailed job status page
2. React component invokes `useTranslationJobItems` hook with job ID
3. Hook validates job ID using UUID schema
4. Hook calls Supabase with `.select('*,keys(full_key)')` to include key names
5. RLS policy validates access through job → project → owner relationship
6. PostgreSQL executes query with LEFT JOIN to keys table
7. Results include item status, error codes/messages, and key full_key for display
8. Hook constructs response with data array and pagination metadata
9. TanStack Query caches results with job-specific key
10. Component renders detailed status with key names and error information

## 6. Security Considerations

### 6.1 Authentication

- All endpoints require valid JWT access token in `Authorization: Bearer {token}` header
- Token is obtained via Supabase Auth during sign-in
- Token is stored in Supabase client session and automatically included in requests
- Edge Function validates token and extracts user ID for authorization

### 6.2 Authorization

- Row-Level Security (RLS) policies enforce project ownership on all operations
- `translation_jobs` table has foreign key to `projects` table with cascade delete
- Users can only access translation jobs for projects they own
- RLS policies are defined in migration files:
  - `translation_jobs_select_policy` - SELECT where project owned by auth.uid()
  - `translation_jobs_insert_policy` - INSERT where project owned by auth.uid()
  - `translation_jobs_update_policy` - UPDATE where project owned by auth.uid()
  - `translation_job_items_select_policy` - SELECT where job's project owned by auth.uid()

### 6.3 Input Validation

- **Client-side validation:** Zod schemas validate all input before sending to backend
- **Edge Function validation:** Server-side validation in Edge Function for security
- **Database-level validation:** CHECK constraints and triggers enforce data integrity
- **Mode-specific validation:** Complex validation rules for key_ids based on translation mode
- **Business logic validation:** Active job detection, locale existence, ownership checks

### 6.4 Rate Limiting

- Edge Function implements rate limiting per user/project
- OpenRouter.ai provides built-in rate limiting
- Job cancellation allows users to stop running operations

### 6.5 Data Exposure

- Project ownership is validated through foreign key relationships and RLS
- Error messages are sanitized to avoid leaking sensitive information
- OpenRouter API keys are stored securely in Edge Function environment
- Job parameters (LLM settings) are stored but API keys are never exposed

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Invalid project ID or job ID (not UUID format)
- Invalid target locale (not BCP-47 format)
- Target locale is the default locale
- Target locale doesn't exist in project
- Invalid translation mode
- Mode-specific key_ids validation failures:
  - `all` mode with non-empty key_ids array
  - `selected` mode with empty key_ids array
  - `single` mode with key_ids array length ≠ 1
- Invalid LLM parameters (temperature outside 0-2 range, max_tokens outside 1-4096)
- Invalid pagination parameters

**Handling:**

- Client maps Zod issues to `ApiErrorResponse` via a shared error layer; all endpoints use the `{ data: null, error: { code, message, details? } }` envelope.

### 7.2 Business Logic Errors (400/409)

**Trigger Conditions:**

- Attempting to cancel a job that's not in `pending` or `running` state (400)
- Creating a job when another job is already active for the project (409)
- Target locale validation failures in Edge Function (400)

**Handling:**

- Return `409` for active job conflicts and `400` for rule violations with clear `message`; avoid exposing internal trigger names.
- Keep responses consistent and preserve partial results where possible.
- On rate‑limit breaches, respond `429` with a clear message (per‑project minutes quota or per‑user concurrent jobs cap).

### 7.3 Authorization Errors (403/404)

**Trigger Conditions:**

- User attempts to access translation jobs for projects they don't own
- RLS policy denies access

**Handling:**

- Supabase returns empty result set for SELECT queries
- Return 404 "Translation job not found or access denied" to avoid leaking existence
- Do not distinguish between "doesn't exist" and "access denied"

### 7.4 Edge Function Errors (500)

**Trigger Conditions:**

- OpenRouter API connection failure
- Rate limit exceeded on OpenRouter
- LLM model unavailable or overloaded
- Database connection issues during job execution
- JSON parsing errors from LLM responses

**Handling:**

- Edge Function logs detailed error information
- Individual key failures are recorded in `translation_job_items` with error codes
- Job status is set to 'failed' only if critical errors prevent continuation
- Partial completion is preserved (completed translations remain valid)
- Error codes align with OpenRouter error responses for debugging
- Errors are normalized to internal enum codes for items (`RATE_LIMIT`, `INVALID_REQUEST`, `MODEL_ERROR`, `API_ERROR`), improving consistency in UI.

### 7.5 Polling and Real-time Updates

**Frontend Polling Strategy:**

- After a `202` response, poll the active job using exponential backoff (e.g., 2s → 2s → 3s → 5s → 5s) and stop when finished or not present.
- Invalidate job lists and related caches upon completion or cancellation to refresh UI.
- Limit polling attempts to approximately 30 minutes to avoid indefinite background activity.

## 8. Performance Considerations

### 8.1 Query Optimization

**Indexing:**

- `idx_translation_jobs_project_status` - Composite index on (project_id, status) for fast active job lookups
- `idx_translation_jobs_project_created_at` - Composite index on (project_id, created_at) for history sorting
- `idx_translation_job_items_job_status` - Composite index on (job_id, status) for filtering job items
- Foreign key indexes auto-created for relationships

**Active Job Detection:**

- Uses optimized query with `status=in.(pending,running)&limit=1`
- Composite index makes this lookup very fast (O(log n))
- Polling frequency balances responsiveness with server load

**Pagination:**

- Use `limit` and `offset` for cursor-based pagination
- Default limits balance UX and performance (20 for jobs, 100 for items)
- Max limits prevent excessive data transfer

### 8.2 Caching Strategy

- Active job: short staleness (~2s) with GC (~5m) to support live updates.
- Job history: medium staleness (~30s) with GC (~10m) for efficient browsing.
- Job items: longer staleness (~5m) with GC (~30m) as items stabilize after completion.

**Cache Invalidation:**

- Create job → invalidate active job cache
- Job status change → invalidate active job and history caches
- Cancel job → invalidate active job and specific job caches

### 8.3 Edge Function Performance

**Asynchronous Processing:**

- Edge Function returns 202 immediately after job creation
- LLM translation happens asynchronously in background
- Uses Supabase client connection pooling for database updates

**Batch Processing:**

- Groups translation requests to OpenRouter when possible
- Implements retry logic with exponential backoff for API failures
- Preserves partial results if job is cancelled or fails

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

- Create `src/features/translation-jobs/{api,components,hooks}` and ensure `api/index.ts` re‑exports hooks and utilities.

### Step 2: Create Translation Jobs Constants

Create `src/shared/constants/translation-jobs.constants.ts` with centralized constants:

- Define pagination defaults, polling backoff, and LLM parameter bounds.
- Provide `TRANSLATION_JOBS_PG_ERROR_CODES`, `TRANSLATION_JOBS_CONSTRAINTS`, and `TRANSLATION_JOBS_ERROR_MESSAGES` for consistent messaging.
- Expose helpers `ACTIVE_JOB_STATUSES`, `FINISHED_JOB_STATUSES`, `CANCELLABLE_JOB_STATUSES` and guards in `TRANSLATION_JOBS_VALIDATION`.
- Re‑export from `src/shared/constants/index.ts` to keep imports cohesive.
- Extend constants used across the Edge Function and client: `DEFAULT_MAX_TOKENS`, `TRANSLATION_MAX_LENGTH` (250), `ERROR_MESSAGE_MAX_LENGTH` (255), and increase poll window (`TRANSLATION_JOBS_POLL_MAX_ATTEMPTS`) to ~30 minutes.

### Step 3: Create Zod Validation Schemas

- Implement `src/features/translation-jobs/api/translation-jobs.schemas.ts` covering IDs, enums, queries, mutations, and responses (see section 3.2).
- Normalize defaults and enforce mode rules to match DB/domain constraints.

### Step 4: Create Error Handling Utilities

- Add `src/features/translation-jobs/api/translation-jobs.errors.ts` that maps DB/Edge errors to `ApiErrorResponse` with stable messages.
- Use `TRANSLATION_JOBS_PG_ERROR_CODES`, `TRANSLATION_JOBS_CONSTRAINTS`, and `TRANSLATION_JOBS_ERROR_MESSAGES`; avoid leaking internal details.

### Step 5: Create Query Keys Factory

Create `src/features/translation-jobs/api/translation-jobs.key-factory.ts`:

- Provide structured keys: `all`, `active(projectId)`, `list(params)`, `detail(jobId)`, and `items(jobId, params?)`.
- Ensure key builders are pure/stable to support targeted invalidation and polling.

### Step 6: Create TanStack Query Hooks

**6.1 Active Job Hook** (`useActiveTranslationJob`)

- Validate `project_id` (`CHECK_ACTIVE_JOB_SCHEMA`), query `pending`/`running`, return array; short `staleTime` and project‑scoped key.

**6.2 Jobs List Hook** (`useTranslationJobs`)

- Validate with `LIST_TRANSLATION_JOBS_SCHEMA`, select with sorting + pagination, and return data with `PaginationMetadata`.
- Use `TRANSLATION_JOBS_KEY_FACTORY.list(params)` and medium `staleTime`.

**Step 5: Create Job Mutation Hook** (`src/features/translation-jobs/api/useCreateTranslationJob/useCreateTranslationJob.ts`)

- Validate input with `CREATE_TRANSLATION_JOB_SCHEMA` and call `/functions/v1/translate`.
- Parse `CreateTranslationJobResponse` and refresh caches using `TRANSLATION_JOBS_KEY_FACTORY` after success.

**Step 6: Create Cancel Mutation Hook** (`src/features/translation-jobs/api/useCancelTranslationJob/useCancelTranslationJob.ts`)

- Validate job ID with `CANCEL_TRANSLATION_JOB_SCHEMA`, enforce cancellable states, and update status to `cancelled`.
- Refresh related caches via `TRANSLATION_JOBS_KEY_FACTORY` and stop client polling on success.

**Step 7: Create Query Hooks**

- `useActiveTranslationJob`, `useTranslationJobs`, `useTranslationJobItems` perform validated queries, return typed data, and expose pagination metadata where applicable.

- Items hook: validate with `GET_JOB_ITEMS_SCHEMA`, join `keys(full_key)`, optional `status` filter, and return typed data with `PaginationMetadata` using `TRANSLATION_JOBS_KEY_FACTORY.items(jobId, params)` and longer `staleTime`.

### Step 7: Create API Index File

Create `src/features/translation-jobs/api/index.ts` re‑exporting: error utilities, `TRANSLATION_JOBS_KEY_FACTORY`, validation schemas, mutation hooks, and query hooks for a single import surface.

### Step 8: Create Polling Hook

- Implement `src/features/translation-jobs/hooks/useTranslationJobPolling.ts` to poll active jobs with exponential backoff, auto‑stop on completion, and trigger cache refresh via query keys.

### Step 9: Write Unit Tests

**Testing Strategy:**

- Use Vitest with Testing Library for comprehensive test coverage
- Mock Supabase client and Edge Functions using test utilities
- Test both success and error scenarios with edge cases
- Verify cache behavior, polling, and job lifecycle management
- Test mode-specific validation and business logic rules
- Aim for 90% coverage threshold as per project requirements

**9.1 Test Active Job Hook:**

Test scenarios:

- Successful active job fetch (returns array with job)
- No active job (returns empty array)
- Multiple jobs with different statuses (only pending/running returned)
- Database error handling
- Cache invalidation after job creation

**9.2 Test Create Job Hook:**

Test scenarios:

- Successful job creation (all modes)
- Mode-specific validation (all/selected/single with key_ids)
- Target locale validation (exists, not default)
- Active job conflict (409)
- Edge Function errors
- Cache invalidation after success

**9.3 Test Cancel Job Hook:**

Test scenarios:

- Successful cancellation
- Job not found (404)
- Job not cancellable (completed/failed/cancelled)
- Optimistic cache updates

**9.4 Test Job Items Hook:**

Test scenarios:

- Successful items fetch with key names
- Status filtering
- Pagination
- Job not found via RLS
- Error code/message display

**9.5 Test Polling Hook:**

Test scenarios:

- Automatic start/stop based on job status
- Exponential backoff intervals
- Max attempts handling
- Cache invalidation timing
- Cleanup on unmount

## 10. Edge Function Implementation Details

### 10.1 Function Structure

The Translation Jobs Edge Function provides the core LLM translation processing functionality:

- **Path:** `/functions/v1/translate`
- **Runtime:** Deno TypeScript
- **Timeout:** 10 minutes (for long translation jobs)
- **Memory:** 512MB (sufficient for batch processing)
- **Concurrency:** Up to 10 concurrent requests per project

### 10.2 Environment Variables

Required environment variables:

- `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL` for provider access and defaults.
- `RATE_LIMIT_REQUESTS_PER_MINUTE`, `RATE_LIMIT_TOKENS_PER_MINUTE` to enforce per‑user quotas.

### 10.3 Request Processing Flow

Execution flow:

- Authenticate, validate input with Zod, and assert project ownership before job creation.
- Enforce rate‑limits: per‑project jobs created in the last minute and per‑user concurrent jobs across owned projects (respond `429` on breach).
- Initialize job and items, process keys in batches with provider calls, and update translations and item statuses.
- Validate outputs (max 250 chars, no newlines), finalize status and timestamps, emit telemetry, and return a concise summary.

### 10.4 Error Handling Strategy

Comprehensive error handling with proper HTTP status codes:

- Validation errors `400`, auth `401/403`, conflicts `409`, provider/network `5xx`, and DB `500` with consistent messages.
- Record per‑item failures, preserve partial success, and avoid leaking internals in responses.

### 10.5 Rate Limiting Implementation

Multi-level rate limiting to prevent abuse:

- Per‑project: up to 10 jobs per minute; enforce single active job at a time; max 10k keys/job.
- Per‑user: up to 3 concurrent jobs across all owned projects (function‑level); provider‑level quotas remain enforced via OpenRouter.
- Global: cap concurrent executions and use a circuit breaker for provider failures.

### 10.7 Monitoring and Observability

- Built‑in structured logs for lifecycle events; collect execution times, API latencies, token usage, and error rates.
- Alerts when failure rate > 5%, response time > 30s, or any error type > 1%.

### 10.8 Testing Strategy

- Cover unit, integration, end‑to‑end, and performance tests: validation, auth, lifecycle, concurrency, provider failures, and timeouts.
