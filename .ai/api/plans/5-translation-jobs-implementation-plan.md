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
2. **List Translation Jobs** - `GET /rest/v1/translation_jobs?project_id=eq.{project_id}&order=created_at.desc&limit=20`
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

**Example Request:**

```http
GET /rest/v1/translation_jobs?project_id=eq.550e8400-e29b-41d4-a716-446655440000&status=in.(pending,running)&limit=1
Authorization: Bearer {access_token}
```

### 2.2 List Translation Jobs

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/translation_jobs?project_id=eq.{project_id}&order=created_at.desc&limit=20`
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

**Example Request:**

```http
GET /rest/v1/translation_jobs?project_id=eq.550e8400-e29b-41d4-a716-446655440000&order=created_at.desc&limit=20&offset=0
Authorization: Bearer {access_token}
```

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

**Example Request:**

```http
GET /rest/v1/translation_job_items?job_id=eq.550e8400-e29b-41d4-a716-446655440000&select=*,keys(full_key)
Authorization: Bearer {access_token}
```

## 3. Used Types

### 3.1 Existing Types (from `src/shared/types/types.ts`)

```typescript
// response dtos
export type TranslationJobResponse = TranslationJob;
export type TranslationJobItemResponse = TranslationJobItem & {
  keys: {
    full_key: string;
  };
};

// request dtos
export interface CreateTranslationJobRequest {
  key_ids: string[];
  mode: TranslationMode;
  params?: TranslationJobParams | null;
  project_id: string;
  target_locale: string;
}

export interface CreateTranslationJobResponse {
  job_id: string;
  message: string;
  status: JobStatus;
}

export interface CancelTranslationJobRequest {
  status: 'cancelled';
}

export interface ListTranslationJobsParams extends PaginationParams {
  project_id: string;
  status?: JobStatus | JobStatus[];
}

// llm parameters
export interface TranslationJobParams {
  max_tokens?: number;
  model?: string;
  provider?: string;
  temperature?: number;
}

// enums
export type JobStatus = Enums<'job_status'>; // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type ItemStatus = Enums<'item_status'>; // 'pending' | 'completed' | 'failed' | 'skipped'
export type TranslationMode = Enums<'translation_mode'>; // 'all' | 'selected' | 'single'

// pagination
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginationMetadata {
  end: number;
  start: number;
  total: number;
}

// error types
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

export interface ConflictErrorResponse extends ApiErrorResponse {
  error: {
    code: 409;
    message: string;
  };
}
```

### 3.2 New Zod Validation Schemas

Create validation schemas in `src/features/translation-jobs/api/translation-jobs.schemas.ts`.
All exported constants now follow screaming snake case and each definition ends with
`satisfies z.ZodType<...>` to guarantee parity with the DTOs in `src/shared/types/types.ts`.

**Note:** The implementation uses constants from `src/shared/constants/translation-jobs.constants.ts` for validation parameters, error messages, and patterns. This ensures consistency between client-side validation and database constraints.

Key exported schemas now include:

- `JOB_ID_SCHEMA`, `PROJECT_ID_SCHEMA`, `KEY_IDS_SCHEMA`, and `LOCALE_CODE_SCHEMA`
- `TRANSLATION_MODE_SCHEMA`, `JOB_STATUS_SCHEMA`, and `ITEM_STATUS_SCHEMA`
- `TRANSLATION_JOB_PARAMS_SCHEMA`, `CHECK_ACTIVE_JOB_SCHEMA`, and `LIST_TRANSLATION_JOBS_SCHEMA`
- `CREATE_TRANSLATION_JOB_SCHEMA`, `CANCEL_TRANSLATION_JOB_SCHEMA`, and `GET_JOB_ITEMS_SCHEMA`
- Response schemas: `TRANSLATION_JOB_RESPONSE_SCHEMA`, `TRANSLATION_JOB_ITEM_RESPONSE_SCHEMA`, and `CREATE_TRANSLATION_JOB_RESPONSE_SCHEMA`

Each schema is defined with the same validation rules as the database layer and terminates with `satisfies z.ZodType<...>` to enforce structural parity with shared DTOs.

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

Single object (using `.maybeSingle()` or singular Accept header):

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

Zod validation errors are automatically converted to ApiErrorResponse format by the global QueryClient error handler configured in `src/app/config/queryClient/queryClient.ts`.

### 7.2 Business Logic Errors (400/409)

**Trigger Conditions:**

- Attempting to cancel a job that's not in `pending` or `running` state (400)
- Creating a job when another job is already active for the project (409)
- Target locale validation failures in Edge Function (400)

**Handling:**

```typescript
// example in edge function
if (existingActiveJob) {
  return new Response(
    JSON.stringify({
      data: null,
      error: {
        code: 409,
        message: 'Another translation job is already active for this project',
      },
    }),
    { status: 409, headers: { 'Content-Type': 'application/json' } }
  );
}
```

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

### 7.5 Polling and Real-time Updates

**Frontend Polling Strategy:**

After creating a job (202 response), client implements exponential backoff polling:

```typescript
// example polling implementation
const pollActiveJob = async () => {
  const response = await useActiveTranslationJob(projectId);
  if (response.data.length === 0 || isFinishedJob(response.data[0])) {
    // job completed or no active job
    stopPolling();
    invalidateJobsList();
  }
};

// poll using exponential backoff intervals: [2000, 2000, 3000, 5000, 5000]ms
const startPolling = () => {
  const intervals = [2000, 2000, 3000, 5000, 5000]; // milliseconds
  // implementation details...
};
```

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

**TanStack Query Configuration:**

```typescript
// active job: short cache for real-time updates
staleTime: 2 * 1000, // 2 seconds
gcTime: 5 * 60 * 1000, // 5 minutes

// job history: medium cache
staleTime: 30 * 1000, // 30 seconds
gcTime: 10 * 60 * 1000, // 10 minutes

// job items: long cache (rarely changes after completion)
staleTime: 5 * 60 * 1000, // 5 minutes
gcTime: 30 * 60 * 1000, // 30 minutes
```

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

```bash
mkdir -p src/features/translation-jobs/{api,components,hooks}
```

### Step 2: Create Translation Jobs Constants

Create `src/shared/constants/translation-jobs.constants.ts` with centralized constants, patterns, and utilities:

```typescript
/**
 * Translation Jobs Constants and Validation Patterns
 *
 * Centralized definitions for translation job validation patterns to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL domain constraints.
 */

// pagination defaults
export const TRANSLATION_JOBS_DEFAULT_LIMIT = 20;
export const TRANSLATION_JOBS_MAX_LIMIT = 100;
export const TRANSLATION_JOBS_DEFAULT_ITEMS_LIMIT = 100;
export const TRANSLATION_JOBS_MAX_ITEMS_LIMIT = 1000;
export const TRANSLATION_JOBS_MIN_OFFSET = 0;

// llm parameter constraints
export const TRANSLATION_JOBS_PARAMS_TEMPERATURE_MIN = 0;
export const TRANSLATION_JOBS_PARAMS_TEMPERATURE_MAX = 2;
export const TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MIN = 1;
export const TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MAX = 4096;

// polling configuration
export const TRANSLATION_JOB_POLL_INTERVALS = [2000, 2000, 3000, 5000, 5000]; // milliseconds
export const TRANSLATION_JOB_POLL_MAX_ATTEMPTS = 180; // 15 minutes max

// postgresql error codes and constraints
export const TRANSLATION_JOBS_PG_ERROR_CODES = {
  CHECK_VIOLATION: '23514',
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
} as const;

export const TRANSLATION_JOBS_CONSTRAINTS = {
  ACTIVE_JOB_UNIQUE: 'prevent_multiple_active_jobs_trigger',
  SOURCE_LOCALE_DEFAULT: 'validate_source_locale_is_default_trigger',
} as const;

// centralized error messages
export const TRANSLATION_JOBS_ERROR_MESSAGES = {
  // validation errors
  INVALID_PROJECT_ID: 'Invalid project ID format',
  INVALID_JOB_ID: 'Invalid job ID format',
  INVALID_KEY_ID: 'Invalid key ID format',
  INVALID_TARGET_LOCALE: 'Target locale must be in BCP-47 format (e.g., "en" or "en-US")',
  INVALID_MODE: 'Mode must be one of: all, selected, single',
  ALL_MODE_NO_KEYS: 'All mode should not include specific key IDs',
  SELECTED_MODE_REQUIRES_KEYS: 'Selected mode requires at least one key ID',
  SINGLE_MODE_ONE_KEY: 'Single mode requires exactly one key ID',
  INVALID_TEMPERATURE: `Temperature must be between ${TRANSLATION_JOBS_PARAMS_TEMPERATURE_MIN} and ${TRANSLATION_JOBS_PARAMS_TEMPERATURE_MAX}`,
  INVALID_MAX_TOKENS: `Max tokens must be between ${TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MIN} and ${TRANSLATION_JOBS_PARAMS_MAX_TOKENS_MAX}`,

  // business logic errors
  TARGET_LOCALE_NOT_FOUND: 'Target locale does not exist in project',
  TARGET_LOCALE_IS_DEFAULT: 'Target locale cannot be the default locale',
  ACTIVE_JOB_EXISTS: 'Another translation job is already active for this project',
  JOB_NOT_CANCELLABLE: 'Job is not in a cancellable state',
  JOB_NOT_FOUND: 'Translation job not found or access denied',

  // edge function errors
  EDGE_FUNCTION_ERROR: 'Translation service temporarily unavailable',
  OPENROUTER_ERROR: 'Translation provider error',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded, please try again later',

  // generic errors
  DATABASE_ERROR: 'Database operation failed',
  NO_DATA_RETURNED: 'No data returned from server',
} as const;

// job status helpers
export const ACTIVE_JOB_STATUSES = ['pending', 'running'] as const;
export const FINISHED_JOB_STATUSES = ['completed', 'failed', 'cancelled'] as const;
export const CANCELLABLE_JOB_STATUSES = ['pending', 'running'] as const;

// validation utilities
export const TRANSLATION_JOB_VALIDATION = {
  isActiveStatus: (status: string): boolean => {
    return ACTIVE_JOB_STATUSES.includes(status as any);
  },
  isFinishedStatus: (status: string): boolean => {
    return FINISHED_JOB_STATUSES.includes(status as any);
  },
  isCancellableStatus: (status: string): boolean => {
    return CANCELLABLE_JOB_STATUSES.includes(status as any);
  },
};
```

Add to `src/shared/constants/index.ts`:

```typescript
export * from './keys.constants';
export * from './locale.constants';
export * from './projects.constants';
export * from './translation-jobs.constants';
```

### Step 3: Create Zod Validation Schemas

Create `src/features/translation-jobs/api/translation-jobs.schemas.ts` with all validation schemas defined in section 3.2.

### Step 4: Create Error Handling Utilities

Create `src/features/translation-jobs/api/translation-jobs.errors.ts`:

```typescript
import type { PostgrestError } from '@supabase/supabase-js';
import type { ApiErrorResponse } from '@/shared/types';
import { createApiErrorResponse } from '@/shared/utils';
import {
  TRANSLATION_JOBS_PG_ERROR_CODES,
  TRANSLATION_JOBS_CONSTRAINTS,
  TRANSLATION_JOBS_ERROR_MESSAGES,
} from '@/shared/constants';

/**
 * Handle database errors and convert them to API errors for translation jobs
 */
export function createTranslationJobDatabaseErrorResponse(
  error: PostgrestError,
  context?: string,
  fallbackMessage?: string
): ApiErrorResponse {
  const LOG_PREFIX = context ? `[${context}]` : '[handleTranslationJobDatabaseError]';
  console.error(`${LOG_PREFIX} Database error:`, error);

  // handle trigger violations (business logic)
  if (error.message.includes('prevent_multiple_active_jobs_trigger')) {
    return createApiErrorResponse(409, TRANSLATION_JOBS_ERROR_MESSAGES.ACTIVE_JOB_EXISTS);
  }
  if (error.message.includes('validate_source_locale_is_default_trigger')) {
    return createApiErrorResponse(400, 'Source locale must be the project default locale');
  }

  // handle check constraint violations
  if (error.code === TRANSLATION_JOBS_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, 'Invalid field value', { constraint: error.details });
  }

  // handle foreign key violations
  if (error.code === TRANSLATION_JOBS_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return createApiErrorResponse(404, 'Referenced resource not found');
  }

  // generic database error
  return createApiErrorResponse(500, fallbackMessage || TRANSLATION_JOBS_ERROR_MESSAGES.DATABASE_ERROR, {
    original: error,
  });
}

/**
 * Handle Edge Function errors
 */
export function createEdgeFunctionErrorResponse(
  statusCode: number,
  message: string,
  context?: string
): ApiErrorResponse {
  const LOG_PREFIX = context ? `[${context}]` : '[handleEdgeFunctionError]';
  console.error(`${LOG_PREFIX} Edge Function error:`, { statusCode, message });

  // map common edge function errors
  if (statusCode === 429) {
    return createApiErrorResponse(429, TRANSLATION_JOBS_ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
  }
  if (statusCode === 409) {
    return createApiErrorResponse(409, TRANSLATION_JOBS_ERROR_MESSAGES.ACTIVE_JOB_EXISTS);
  }
  if (statusCode >= 500) {
    return createApiErrorResponse(500, TRANSLATION_JOBS_ERROR_MESSAGES.EDGE_FUNCTION_ERROR);
  }

  return createApiErrorResponse(statusCode, message);
}
```

### Step 5: Create Query Keys Factory

Create `src/features/translation-jobs/api/translation-jobs.key-factory.ts`:

```typescript
import type { ListTranslationJobsParams } from '@/shared/types';

/**
 * Query key factory for translation jobs
 * Follows TanStack Query best practices for structured query keys
 */
export const TRANSLATION_JOBS_KEY_FACTORY = {
  all: ['translation-jobs'] as const,
  active: (projectId: string) => [...TRANSLATION_JOBS_KEY_FACTORY.activeJobs(), projectId] as const,
  activeJobs: () => [...TRANSLATION_JOBS_KEY_FACTORY.all, 'active'] as const,
  detail: (job_id: string) => [...TRANSLATION_JOBS_KEY_FACTORY.details(), job_id] as const,
  details: () => [...TRANSLATION_JOBS_KEY_FACTORY.all, 'detail'] as const,
  items: (job_id: string, params?: any) => [...TRANSLATION_JOBS_KEY_FACTORY.jobItems(), job_id, params] as const,
  jobItems: () => [...TRANSLATION_JOBS_KEY_FACTORY.all, 'items'] as const,
  list: (params: ListTranslationJobsParams) => [...TRANSLATION_JOBS_KEY_FACTORY.lists(), params] as const,
  lists: () => [...TRANSLATION_JOBS_KEY_FACTORY.all, 'list'] as const,
};
```

### Step 6: Create TanStack Query Hooks

**6.1 Create `src/features/translation-jobs/api/useActiveTranslationJob/useActiveTranslationJob.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { ApiErrorResponse, TranslationJobResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createTranslationJobDatabaseErrorResponse } from '../translation-jobs.errors';
import { TRANSLATION_JOBS_KEY_FACTORY } from '../translation-jobs.key-factory';
import { CHECK_ACTIVE_JOB_SCHEMA, TRANSLATION_JOB_RESPONSE_SCHEMA } from '../translation-jobs.schemas';

/**
 * Check for active translation job in project
 *
 * Fast lookup optimized for polling during translation progress.
 * Uses composite index on (project_id, status) for O(log n) performance.
 * Returns array that may be empty if no active job exists.
 */
export function useActiveTranslationJob(projectId: string) {
  const supabase = useSupabase();

  return useQuery<TranslationJobResponse[], ApiErrorResponse>({
    gcTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      // validate project id
      const validated = CHECK_ACTIVE_JOB_SCHEMA.parse({ project_id: projectId });

      const { data, error } = await supabase
        .from('translation_jobs')
        .select('*')
        .eq('project_id', validated.project_id)
        .in('status', ['pending', 'running'])
        .limit(1);

      if (error) {
        throw createTranslationJobDatabaseErrorResponse(error, 'useActiveTranslationJob', 'Failed to check active job');
      }

      // runtime validation of response data
      const jobs = z.array(TRANSLATION_JOB_RESPONSE_SCHEMA).parse(data ?? []);
      return jobs;
    },
    queryKey: TRANSLATION_JOBS_KEY_FACTORY.active(projectId),
    staleTime: 2 * 1000, // 2 seconds for real-time polling
  });
}
```

**6.2 Create `src/features/translation-jobs/api/useTranslationJobs/useTranslationJobs.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { ApiErrorResponse, ListTranslationJobsParams, TranslationJobResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createTranslationJobDatabaseErrorResponse } from '../translation-jobs.errors';
import { TRANSLATION_JOBS_KEY_FACTORY } from '../translation-jobs.key-factory';
import { LIST_TRANSLATION_JOBS_SCHEMA, TRANSLATION_JOB_RESPONSE_SCHEMA } from '../translation-jobs.schemas';

/**
 * List response wrapper for translation jobs
 */
interface TranslationJobListResponse {
  data: TranslationJobResponse[];
  metadata: {
    start: number;
    end: number;
    total: number;
  };
}

/**
 * Fetch paginated list of translation jobs for project
 */
export function useTranslationJobs(params: ListTranslationJobsParams) {
  const supabase = useSupabase();

  return useQuery<TranslationJobListResponse, ApiErrorResponse>({
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      // validate parameters
      const validated = LIST_TRANSLATION_JOBS_SCHEMA.parse(params);

      let query = supabase
        .from('translation_jobs')
        .select('*', { count: 'exact' })
        .eq('project_id', validated.project_id)
        .range(validated.offset, validated.offset + validated.limit - 1);

      // apply status filter if provided
      if (validated.status) {
        if (Array.isArray(validated.status)) {
          query = query.in('status', validated.status);
        } else {
          query = query.eq('status', validated.status);
        }
      }

      // apply sorting
      const [field, direction] = validated.order.split('.');
      query = query.order(field, { ascending: direction === 'asc' });

      const { count, data, error } = await query;

      if (error) {
        throw createTranslationJobDatabaseErrorResponse(
          error,
          'useTranslationJobs',
          'Failed to fetch translation jobs'
        );
      }

      // runtime validation of response data
      const jobs = z.array(TRANSLATION_JOB_RESPONSE_SCHEMA).parse(data ?? []);

      return {
        data: jobs,
        metadata: {
          end: validated.offset + jobs.length - 1,
          start: validated.offset,
          total: count || 0,
        },
      };
    },
    queryKey: TRANSLATION_JOBS_KEY_FACTORY.list(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}
```

**6.3 Create `src/features/translation-jobs/api/useCreateTranslationJob/useCreateTranslationJob.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiErrorResponse, CreateTranslationJobRequest, CreateTranslationJobResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createEdgeFunctionErrorResponse } from '../translation-jobs.errors';
import { TRANSLATION_JOBS_KEY_FACTORY } from '../translation-jobs.key-factory';
import { CREATE_TRANSLATION_JOB_SCHEMA, CREATE_TRANSLATION_JOB_RESPONSE_SCHEMA } from '../translation-jobs.schemas';

/**
 * Create new translation job via Edge Function
 *
 * Calls the /functions/v1/translate Edge Function which handles:
 * - Server-side validation and business logic
 * - Job and job items creation
 * - Asynchronous LLM translation processing
 * - Returns 202 immediately while processing continues in background
 */
export function useCreateTranslationJob() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<CreateTranslationJobResponse, ApiErrorResponse, CreateTranslationJobRequest>({
    mutationFn: async (jobData) => {
      // validate input
      const validated = CREATE_TRANSLATION_JOB_SCHEMA.parse(jobData);

      // call edge function
      const { data, error } = await supabase.functions.invoke('translate', {
        body: validated,
      });

      if (error) {
        throw createEdgeFunctionErrorResponse(
          error.status || 500,
          error.message || 'Translation service error',
          'useCreateTranslationJob'
        );
      }

      // runtime validation of response data
      return CREATE_TRANSLATION_JOB_RESPONSE_SCHEMA.parse(data);
    },
    onSuccess: (_, variables) => {
      // invalidate active job cache for polling to start
      queryClient.invalidateQueries({
        queryKey: TRANSLATION_JOBS_KEY_FACTORY.active(variables.project_id),
      });
      // invalidate job list cache
      queryClient.invalidateQueries({
        queryKey: TRANSLATION_JOBS_KEY_FACTORY.lists(),
      });
    },
  });
}
```

**6.4 Create `src/features/translation-jobs/api/useCancelTranslationJob/useCancelTranslationJob.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiErrorResponse, TranslationJobResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';
import { createTranslationJobDatabaseErrorResponse } from '../translation-jobs.errors';
import { TRANSLATION_JOBS_KEY_FACTORY } from '../translation-jobs.key-factory';
import { CANCEL_TRANSLATION_JOB_SCHEMA, TRANSLATION_JOB_RESPONSE_SCHEMA } from '../translation-jobs.schemas';

/**
 * Cancel running translation job
 *
 * Updates job status to 'cancelled' and sets finished_at timestamp.
 * Edge Function will check cancellation flag and stop processing between API calls.
 * Completed translations are preserved.
 */
export function useCancelTranslationJob() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<TranslationJobResponse, ApiErrorResponse, { job_id: string }>({
    mutationFn: async ({ job_id }) => {
      // validate input
      const validated = CANCEL_TRANSLATION_JOB_SCHEMA.parse({
        job_id: job_id,
        status: 'cancelled',
      });

      const { data, error } = await supabase
        .from('translation_jobs')
        .update({
          status: 'cancelled',
          finished_at: new Date().toISOString(),
        })
        .eq('id', validated.job_id)
        .select('*')
        .maybeSingle();

      if (error) {
        throw createTranslationJobDatabaseErrorResponse(error, 'useCancelTranslationJob', 'Failed to cancel job');
      }

      if (!data) {
        throw createApiErrorResponse(404, 'Translation job not found or access denied');
      }

      // runtime validation of response data
      const validatedResponse = TRANSLATION_JOB_RESPONSE_SCHEMA.parse(data);
      return validatedResponse;
    },
    onSuccess: (data) => {
      // update specific job cache
      queryClient.setQueryData(TRANSLATION_JOBS_KEY_FACTORY.detail(data.id), data);
      // invalidate active jobs cache (job is no longer active)
      queryClient.invalidateQueries({
        queryKey: TRANSLATION_JOBS_KEY_FACTORY.active(data.project_id),
      });
      // invalidate job list cache
      queryClient.invalidateQueries({
        queryKey: TRANSLATION_JOBS_KEY_FACTORY.lists(),
      });
    },
  });
}
```

**6.5 Create `src/features/translation-jobs/api/useTranslationJobItems/useTranslationJobItems.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { ApiErrorResponse, TranslationJobItemResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createTranslationJobDatabaseErrorResponse } from '../translation-jobs.errors';
import { TRANSLATION_JOBS_KEY_FACTORY } from '../translation-jobs.key-factory';
import { GET_JOB_ITEMS_SCHEMA, TRANSLATION_JOB_ITEM_RESPONSE_SCHEMA } from '../translation-jobs.schemas';

/**
 * List response wrapper for translation job items
 */
interface TranslationJobItemListResponse {
  data: TranslationJobItemResponse[];
  metadata: {
    start: number;
    end: number;
    total: number;
  };
}

/**
 * Get job items parameters
 */
interface GetJobItemsParams {
  job_id: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch detailed item-level status for translation job
 *
 * Includes key information via JOIN for displaying full_key names.
 * Used for debugging failed translations and showing detailed progress.
 */
export function useTranslationJobItems(params: GetJobItemsParams) {
  const supabase = useSupabase();

  return useQuery<TranslationJobItemListResponse, ApiErrorResponse>({
    gcTime: 30 * 60 * 1000, // 30 minutes
    queryFn: async () => {
      // validate parameters
      const validated = GET_JOB_ITEMS_SCHEMA.parse({
        job_id: params.job_id,
        status: params.status,
        limit: params.limit,
        offset: params.offset,
      });

      let query = supabase
        .from('translation_job_items')
        .select('*, keys(full_key)', { count: 'exact' })
        .eq('job_id', validated.job_id)
        .range(validated.offset, validated.offset + validated.limit - 1);

      // apply status filter if provided
      if (validated.status) {
        query = query.eq('status', validated.status);
      }

      // order by creation time
      query = query.order('created_at', { ascending: true });

      const { count, data, error } = await query;

      if (error) {
        throw createTranslationJobDatabaseErrorResponse(error, 'useTranslationJobItems', 'Failed to fetch job items');
      }

      // runtime validation of response data
      const items = z.array(TRANSLATION_JOB_ITEM_RESPONSE_SCHEMA).parse(data ?? []);

      return {
        data: items,
        metadata: {
          end: validated.offset + items.length - 1,
          start: validated.offset,
          total: count || 0,
        },
      };
    },
    queryKey: TRANSLATION_JOBS_KEY_FACTORY.items(params.job_id, params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Step 7: Create API Index File

Create `src/features/translation-jobs/api/index.ts`:

```typescript
/**
 * Translation Jobs API
 *
 * This module provides TanStack Query hooks for managing LLM translation jobs.
 * All hooks use the shared Supabase client from context and follow React Query best practices.
 *
 * @module features/translation-jobs/api
 */

// error utilities
export { createTranslationJobDatabaseErrorResponse, createEdgeFunctionErrorResponse } from './translation-jobs.errors';

// query keys
export { TRANSLATION_JOBS_KEY_FACTORY } from './translation-jobs.key-factory';

// validation schemas
export * from './translation-jobs.schemas';

// mutation hooks
export { useCancelTranslationJob } from './useCancelTranslationJob/useCancelTranslationJob';
export * from './useCreateTranslationJob';

// query hooks
export * from './useActiveTranslationJob';
export * from './useTranslationJobs';
export * from './useTranslationJobItems';
```

### Step 8: Create Polling Hook

Create `src/features/translation-jobs/hooks/useTranslationJobPolling.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveTranslationJob, TRANSLATION_JOBS_KEY_FACTORY } from '../api';
import { TRANSLATION_JOB_POLL_INTERVALS, TRANSLATION_JOB_POLL_MAX_ATTEMPTS } from '@/shared/constants';

/**
 * Custom hook for polling active translation job with exponential backoff
 *
 * Automatically starts/stops polling based on job status.
 * Uses exponential backoff to reduce server load for long-running jobs.
 */
export function useTranslationJobPolling(projectId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const activeJobQuery = useActiveTranslationJob(projectId);
  const pollAttemptRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const activeJob = activeJobQuery.data?.[0];
  const hasActiveJob = Boolean(activeJob);
  const isJobRunning = activeJob?.status === 'pending' || activeJob?.status === 'running';

  useEffect(() => {
    if (!enabled || !hasActiveJob || !isJobRunning) {
      // clear polling if no active job or job finished
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
      pollAttemptRef.current = 0;
      return;
    }

    const scheduleNextPoll = () => {
      if (pollAttemptRef.current >= TRANSLATION_JOB_POLL_MAX_ATTEMPTS) {
        console.warn('Translation job polling max attempts reached');
        return;
      }

      const intervalIndex = Math.min(pollAttemptRef.current, TRANSLATION_JOB_POLL_INTERVALS.length - 1);
      const interval = TRANSLATION_JOB_POLL_INTERVALS[intervalIndex];

      timeoutRef.current = setTimeout(() => {
        pollAttemptRef.current++;
        queryClient.invalidateQueries({
          queryKey: TRANSLATION_JOBS_KEY_FACTORY.active(projectId),
        });
        scheduleNextPoll();
      }, interval);
    };

    scheduleNextPoll();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [projectId, enabled, hasActiveJob, isJobRunning, queryClient]);

  return {
    activeJob,
    hasActiveJob,
    isJobRunning,
    isPolling: Boolean(timeoutRef.current),
    pollAttempt: pollAttemptRef.current,
  };
}
```

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

Required environment variables for Edge Function operation:

```typescript
// openrouter integration
OPENROUTER_API_KEY: string; // OpenRouter API authentication
OPENROUTER_BASE_URL: string; // Default: "https://openrouter.ai/api/v1"
OPENROUTER_MODEL: string; // Default model (e.g., "google/gemini-2.5-flash-lite")

// rate limiting
RATE_LIMIT_REQUESTS_PER_MINUTE: number; // Default: 60
RATE_LIMIT_TOKENS_PER_MINUTE: number; // Default: 100000
```

### 10.3 Request Processing Flow

Detailed flow of Edge Function execution:

```typescript
1. **Authentication & Authorization**
   - Extract JWT token from Authorization header
   - Validate user session with Supabase Auth
   - Extract user_id for ownership validation

2. **Input Validation**
   - Validate request body using Zod schemas
   - Check required fields: project_id, target_locale, mode, key_ids
   - Validate mode-specific rules (all/selected/single)

3. **Business Logic Validation**
   - Verify project ownership (user owns project)
   - Validate target_locale exists in project_locales
   - Ensure target_locale ≠ project.default_locale
   - Check for active jobs (prevent concurrent jobs)

4. **Job Initialization**
   - Create translation_jobs record (status: 'pending')
   - Create translation_job_items for selected keys
   - Set job status to 'running' and started_at timestamp

5. **Background Processing**
   - For each key in parallel batches:
     a. Fetch source value from translations table
     b. Build translation context and prompt
     c. Call OpenRouter API with LLM parameters
     d. Parse and validate translation response
     e. Update translations table with new value
     f. Update translation_job_items status
     g. Increment job counters (completed_keys/failed_keys)

6. **Job Completion**
   - Update job status ('completed' or 'failed')
   - Set finished_at timestamp
   - Emit telemetry event (translation_completed)
   - Return job summary
```

### 10.4 Error Handling Strategy

Comprehensive error handling with proper HTTP status codes:

```typescript
// input validation errors (400)
- Invalid project_id format
- Missing required fields
- Invalid mode/key_ids combination
- Invalid LLM parameters

// authentication errors (401)
- Missing Authorization header
- Invalid JWT token
- Expired session

// authorization errors (403)
- User doesn't own project
- Project access denied

// business logic errors (400/409)
- Target locale doesn't exist (400)
- Target locale is default locale (400)
- Active job already exists (409)

// external api errors (500)
- OpenRouter API unavailable
- Rate limits exceeded (429 → 500)
- Model errors or timeouts
- Network connectivity issues

// database errors (500)
- Connection failures
- Constraint violations
- Transaction rollback scenarios
```

### 10.5 Rate Limiting Implementation

Multi-level rate limiting to prevent abuse:

```typescript
// per-user limits
- 60 requests per minute per user
- 100,000 tokens per minute per user
- 5 concurrent jobs maximum

// per-project limits
- 1 active job at any time
- Max 10,000 keys per job

// global limits
- 10 concurrent Edge Function executions
- Circuit breaker for OpenRouter API failures
```

### 10.7 Monitoring and Observability

Built-in logging and metrics collection:

```typescript
// structured logging
console.log({
  level: 'info',
  event: 'job_started',
  job_id: job.id,
  projectId: job.project_id,
  keyCount: job.total_keys
});

// performance metrics
- Job execution time
- API response times
- Token usage statistics
- Error rates by category

// alerting thresholds
- Job failure rate > 5%
- API response time > 30 seconds
- Error rate > 1% for any error type
```

### 10.8 Testing Strategy

Comprehensive test coverage for Edge Function:

```typescript
// unit tests
- Input validation scenarios
- Error handling paths
- Authentication/authorization logic

// integration tests
- OpenRouter API mock responses
- Database transaction testing
- Job lifecycle state transitions
- Concurrent job prevention

// end-to-end tests
- Full translation job workflows
- Error recovery scenarios
- Rate limiting behavior

// performance tests
- Large job handling (1000+ keys)
- Concurrent request handling
- Memory usage optimization
- Timeout behavior verification
```
