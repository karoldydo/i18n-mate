# API Endpoint Implementation Plan: Translation Jobs

## 1. Endpoint Overview

The Translation Jobs API provides management of LLM-powered translation workflows. It enables users to automate translation of keys from the default locale to target locales using OpenRouter.ai. The API consists of four endpoints that handle checking active jobs, listing job history, creating new translation jobs via Supabase Edge Functions, and cancelling running jobs with proper status tracking and progress monitoring.

### Key Features

- Active job checking for progress monitoring and preventing concurrent jobs
- Paginated job history with detailed metrics (costs, success rates)
- Asynchronous job creation with three modes (all/selected/single)
- Graceful cancellation with partial translation preservation
- Progress tracking via polling with 2-second intervals
- Integration with OpenRouter.ai for multi-provider LLM access

### Endpoints Summary

1. **Check Active Job** - `GET /rest/v1/translation_jobs?project_id=eq.{project_id}&status=in.(pending,running)&limit=1`
2. **List Translation Jobs** - `GET /rest/v1/translation_jobs?project_id=eq.{project_id}&order=created_at.desc&limit=20`
3. **Create Translation Job** - `POST /functions/v1/translate` (Supabase Edge Function)
4. **Cancel Translation Job** - `PATCH /rest/v1/translation_jobs?id=eq.{job_id}`

## 2. Request Details

### 2.1 Check Active Job

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/translation_jobs?project_id=eq.{project_id}&status=in.(pending,running)&limit=1`
- **Authentication:** Required (JWT via Authorization header)
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project ID (via query filter)
  - Optional: None
- **Request Body:** None

**Example Request:**

```http
GET /rest/v1/translation_jobs?project_id=eq.550e8400-e29b-41d4-a716-446655440000&status=in.(pending,running)&limit=1
Authorization: Bearer {access_token}
```

**Use Case:** Frontend polls this endpoint every 2 seconds during translation progress to update UI with completion percentage and handle job state transitions.

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
    "model": "anthropic/claude-3.5-sonnet",
    "provider": "openrouter",
    "temperature": 0.3
  },
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "target_locale": "pl"
}
```

**Field Validation:**

- `project_id` (required, UUID) - Project ID, must be owned by user
- `target_locale` (required, string) - BCP-47 locale code, must exist in project locales, **cannot be default locale**
- `mode` (required, enum) - One of: `all`, `selected`, `single`
- `key_ids` (conditionally required, string[]) - Required for `selected` and `single` modes, must be non-empty array
- `params` (optional, object) - LLM parameters:
  - `provider` (optional, string) - OpenRouter provider (default: `openrouter`)
  - `model` (optional, string) - Model identifier (default: `anthropic/claude-3.5-sonnet`)
  - `temperature` (optional, number) - 0-1 range (default: 0.3)
  - `max_tokens` (optional, number) - Positive integer (default: 256)

**Mode-Specific Rules:**

- `mode: 'all'` - Translate all keys in project, `key_ids` must be empty array
- `mode: 'selected'` - Translate specific keys, `key_ids` must contain 2+ UUIDs
- `mode: 'single'` - Translate one key, `key_ids` must contain exactly 1 UUID

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

- `status` (required, string) - Must be exactly `"cancelled"`
- Job must be in `pending` or `running` state

## 3. Used Types

### 3.1 Existing Types (from `src/shared/types/types.ts`)

```typescript
// Response DTOs
export type TranslationJobResponse = TranslationJob;

export interface CreateTranslationJobResponse {
  job_id: string;
  message: string;
  status: JobStatus;
}

export interface TranslationJobParams {
  max_tokens?: number;
  model?: string;
  provider?: string;
  temperature?: number;
}

// Request DTOs
export interface CreateTranslationJobRequest {
  key_ids: string[];
  mode: TranslationMode;
  params?: null | TranslationJobParams;
  project_id: string;
  target_locale: string;
}

export interface CancelTranslationJobRequest {
  status: 'cancelled';
}

export interface ListTranslationJobsParams extends PaginationParams {
  project_id: string;
  status?: JobStatus | JobStatus[];
}

// Enums
export type TranslationMode = Enums<'translation_mode'>; // 'all' | 'selected' | 'single'
export type JobStatus = Enums<'job_status'>; // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

// Type Guards
export function isActiveJob(job: TranslationJob): boolean {
  return job.status === 'pending' || job.status === 'running';
}

export function isFinishedJob(job: TranslationJob): boolean {
  return job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled';
}
```

### 3.2 New Zod Validation Schemas

Create validation schemas in `src/features/translation-jobs/api/translation-jobs.schemas.ts`:

```typescript
import { z } from 'zod';

// Translation mode enum
const translationModeSchema = z.enum(['all', 'selected', 'single']);

// Job status enum
const jobStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);

// Active job statuses
const activeJobStatusSchema = z.enum(['pending', 'running']);

// LLM parameters validation
const translationJobParamsSchema = z
  .object({
    provider: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(1).optional(),
    max_tokens: z.number().int().positive().optional(),
  })
  .optional()
  .nullable();

// Project ID schema
const projectIdSchema = z.string().uuid('Invalid project ID format');

// Job ID schema
const jobIdSchema = z.string().uuid('Invalid job ID format');

// Key IDs array schema
const keyIdsSchema = z.array(z.string().uuid('Invalid key ID format'));

// Check Active Job Schema
export const checkActiveJobSchema = z.object({
  project_id: projectIdSchema,
});

// List Translation Jobs Schema
export const listTranslationJobsSchema = z.object({
  project_id: projectIdSchema,
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  status: z.union([jobStatusSchema, z.array(jobStatusSchema)]).optional(),
});

// Create Translation Job Schema with conditional validation
export const createTranslationJobSchema = z
  .object({
    project_id: projectIdSchema,
    target_locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
      message: 'Target locale must be in BCP-47 format (e.g., "pl" or "en-US")',
    }),
    mode: translationModeSchema,
    key_ids: keyIdsSchema,
    params: translationJobParamsSchema,
  })
  .superRefine((data, ctx) => {
    // Validate key_ids based on mode
    if (data.mode === 'all') {
      if (data.key_ids.length !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'key_ids must be empty array for mode "all"',
          path: ['key_ids'],
        });
      }
    } else if (data.mode === 'single') {
      if (data.key_ids.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'key_ids must contain exactly one UUID for mode "single"',
          path: ['key_ids'],
        });
      }
    } else if (data.mode === 'selected') {
      if (data.key_ids.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'key_ids must contain at least 2 UUIDs for mode "selected"',
          path: ['key_ids'],
        });
      }
    }
  });

// Cancel Translation Job Schema
export const cancelTranslationJobSchema = z.object({
  id: jobIdSchema,
  status: z.literal('cancelled'),
});
```

### 3.3 Progress Tracking Interface

Create in `src/features/translation-jobs/types.ts`:

```typescript
export interface TranslationProgress {
  completed: number;
  failed: number;
  isActive: boolean;
  jobId: string;
  percentage: number;
  status: JobStatus;
  total: number;
}
```

## 4. Response Details

### 4.1 Check Active Job

**Success Response (200 OK):**

Returns array with 0-1 job objects:

```json
[
  {
    "completed_keys": 45,
    "created_at": "2025-01-15T10:15:00Z",
    "failed_keys": 2,
    "id": "job-uuid",
    "mode": "all",
    "project_id": "project-uuid",
    "source_locale": "en",
    "started_at": "2025-01-15T10:15:00Z",
    "status": "running",
    "target_locale": "pl",
    "total_keys": 100
  }
]
```

**Empty array if no active job:**

```json
[]
```

### 4.2 List Translation Jobs

**Success Response (200 OK):**

```json
[
  {
    "actual_cost_usd": "0.1150",
    "completed_keys": 98,
    "created_at": "2025-01-15T10:00:00Z",
    "estimated_cost_usd": "0.1200",
    "failed_keys": 2,
    "finished_at": "2025-01-15T10:05:00Z",
    "id": "job-uuid",
    "mode": "all",
    "model": "anthropic/claude-3.5-sonnet",
    "params": {
      "max_tokens": 256,
      "temperature": 0.3
    },
    "project_id": "project-uuid",
    "provider": "openrouter",
    "source_locale": "en",
    "started_at": "2025-01-15T10:00:00Z",
    "status": "completed",
    "target_locale": "pl",
    "total_keys": 100,
    "updated_at": "2025-01-15T10:05:00Z"
  }
]
```

### 4.3 Create Translation Job

**Success Response (202 Accepted):**

```json
{
  "job_id": "job-uuid",
  "message": "Translation job created",
  "status": "pending"
}
```

**Frontend Behavior:** After receiving 202, client starts polling `GET /rest/v1/translation_jobs?id=eq.{job_id}` every 2 seconds until `status IN ('completed', 'failed', 'cancelled')`.

### 4.4 Cancel Translation Job

**Success Response (200 OK):**

```json
{
  "finished_at": "2025-01-15T10:18:00Z",
  "id": "job-uuid",
  "status": "cancelled"
}
```

### 4.5 Error Responses

**400 Bad Request (Validation Error):**

```json
{
  "error": {
    "code": "validation_error",
    "details": {
      "constraint": "custom",
      "field": "key_ids"
    },
    "message": "key_ids must contain exactly one UUID for mode 'single'"
  }
}
```

**400 Bad Request (Invalid State Transition):**

```json
{
  "error": {
    "code": "invalid_state",
    "message": "Cannot cancel job with status 'completed'"
  }
}
```

**401 Unauthorized:**

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authentication required"
  }
}
```

**403 Forbidden:**

```json
{
  "error": {
    "code": "forbidden",
    "message": "Project not owned by user"
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "not_found",
    "message": "Translation job not found or access denied"
  }
}
```

**409 Conflict:**

```json
{
  "error": {
    "code": "conflict",
    "message": "Another translation job is already active for this project"
  }
}
```

**500 Internal Server Error:**

```json
{
  "error": {
    "code": "internal_server_error",
    "message": "Translation job failed due to LLM API error"
  }
}
```

## 5. Data Flow

### 5.1 Check Active Job Flow

1. User initiates translation from React component
2. Component calls `useCheckActiveJob` hook with project ID
3. Hook validates project ID using Zod schema
4. Hook retrieves Supabase client from `useSupabase()` context
5. Client queries with `.eq('project_id', projectId).in('status', ['pending', 'running']).limit(1)`
6. RLS policy filters jobs by project ownership (indirect via `project_id → projects.owner_user_id`)
7. Index `idx_translation_jobs_project_status` ensures fast lookup
8. If active job exists, returns array with 1 job object
9. If no active job, returns empty array
10. TanStack Query caches result with 0ms staleTime (always fresh for active jobs)
11. Component enables/disables translation button based on result

### 5.2 List Translation Jobs Flow

1. User navigates to project translation history page
2. Component invokes `useTranslationJobs` hook with project ID and pagination params
3. Hook validates params using Zod schema
4. Hook calls Supabase client with `.eq('project_id', projectId).order('created_at', { ascending: false }).range(offset, offset + limit - 1)`
5. RLS policy validates project ownership
6. PostgreSQL returns jobs with all fields including cost metrics
7. Results are returned with `Content-Range` header for pagination
8. TanStack Query caches results with 5-minute staleTime
9. Component renders job history table with status badges and cost info

### 5.3 Create Translation Job Flow

1. User submits translation form (selects target locale, mode, optional keys)
2. `useCreateTranslationJob` mutation hook receives form data
3. Hook validates data using `createTranslationJobSchema` (including mode-specific key_ids rules)
4. If validation fails, return 400 error immediately with field-specific message
5. Hook checks for active jobs using `useCheckActiveJob` hook
6. If active job exists, show user warning and prevent submission
7. Hook calls Supabase Edge Function `/functions/v1/translate` with validated data
8. **Edge Function execution:**
   - a. Validates request and verifies project ownership via RLS
   - b. Checks target_locale is not default locale (query projects table)
   - c. Creates `translation_jobs` record with `status = 'pending'`
   - d. Database trigger `prevent_multiple_active_jobs_trigger` enforces one active job per project
   - e. If concurrent job exists, PostgreSQL RAISE EXCEPTION → hook returns 409
   - f. Database trigger `validate_source_locale_is_default_trigger` validates source locale
   - g. Determines key set based on mode:
     - `all`: SELECT all keys for project
     - `selected`/`single`: Use provided key_ids
   - h. Creates `translation_job_items` records for each key with `status = 'pending'`
   - i. Updates job status to `running` and sets `started_at`
   - j. For each key (iterative processing):
     - Fetch source value from translations table (default locale)
     - Call OpenRouter API with context and LLM params
     - Parse and validate response (max 250 chars, no newline)
     - Update corresponding `translations` record:
       - `value = <translated_text>`
       - `is_machine_translated = true`
       - `updated_source = 'system'`
       - `updated_by_user_id = NULL`
     - Update `translation_job_items` status to `completed` or `failed`
     - Update job counters: `completed_keys++` or `failed_keys++`
     - Check if job was cancelled (SELECT status) → if yes, break loop
   - k. Update job status to `completed` or `failed`
   - l. Set `finished_at`, `actual_cost_usd`
   - m. Emit `translation_completed` telemetry event
9. Edge Function returns 202 Accepted with job_id
10. TanStack Query invalidates active job cache
11. Component starts polling via `useTranslationProgress` hook

### 5.4 Translation Progress Polling Flow

1. After job creation, `useTranslationProgress` hook starts polling
2. Hook queries `GET /rest/v1/translation_jobs?id=eq.{job_id}` every 2 seconds
3. RLS policy validates project ownership
4. Hook calculates progress:
   - `percentage = (completed_keys / total_keys) * 100`
   - `isActive = status IN ('pending', 'running')`
5. Component renders progress bar with percentage
6. When `isActive` becomes false:
   - Stop polling
   - Invalidate translations cache
   - Show completion notification (success/failure/cancelled)
   - Update UI to reflect new translations
7. If job status is `failed`, display error message from job record

### 5.5 Cancel Translation Job Flow

1. User clicks cancel button on progress modal
2. `useCancelTranslationJob` mutation hook receives job ID
3. Hook validates UUID format and cancellable status
4. Hook calls Supabase `.update({ status: 'cancelled' }).eq('id', jobId)`
5. Edge Function checks cancellation flag between OpenRouter API calls
6. When flag detected, Edge Function:
   - Stops processing remaining keys
   - Updates job status to `cancelled`
   - Sets `finished_at`
   - Keeps partially completed translations
7. Database returns updated job with `status: 'cancelled'`
8. If job not in cancellable state, Supabase constraint/trigger returns error → hook returns 400
9. TanStack Query invalidates job cache
10. Polling hook detects status change and stops polling
11. Component shows "Translation cancelled" message

## 6. Security Considerations

### 6.1 Authentication

- All endpoints require valid JWT access token in `Authorization: Bearer {token}` header
- Token obtained via Supabase Auth during sign-in
- Token stored in Supabase client session and automatically included in requests
- Edge Function validates token using `supabase.auth.getUser()`

### 6.2 Authorization

- **Indirect RLS enforcement:** Translation jobs don't have direct user relationship, but:
  - `translation_jobs.project_id` → `projects.id`
  - `projects.owner_user_id = auth.uid()` enforced by projects RLS
- Translation jobs RLS policies in `supabase/migrations/20251013143400_create_rls_policies.sql`:
  - SELECT: `project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())`
  - INSERT: Edge Function only (no direct INSERT via REST)
  - UPDATE: Same as SELECT (for cancel operation)
  - DELETE: Not allowed (jobs are permanent records)
- Edge Function validates project ownership before creating job

### 6.3 Input Validation

- **Client-side validation:** Zod schemas validate all input before sending to backend
- **Edge Function validation:** Re-validates request payload to prevent bypass
- **Database-level validation:**
  - CHECK constraint: `target_locale <> source_locale`
  - Trigger: `validate_source_locale_is_default_trigger` ensures source = default locale
  - Trigger: `prevent_multiple_active_jobs_trigger` enforces one active job per project
  - Foreign keys enforce referential integrity

### 6.4 LLM Integration Security

- **Parameter sanitization:** Edge Function validates and sanitizes params before OpenRouter call
- **API key protection:** OpenRouter API key stored in Supabase secrets, never exposed to client
- **Cost protection:**
  - Estimate costs before job creation
  - Set max_tokens limit (default 256, max 1000)
  - Track actual costs in database
  - Implement rate limiting on job creation (future enhancement)
- **Response validation:**
  - Max length 250 characters per translation
  - No newline characters allowed
  - Sanitize output before database insertion

### 6.5 Concurrency Control

- Database trigger prevents multiple active jobs per project (enforced at INSERT/UPDATE)
- Frontend pre-flight check using `useCheckActiveJob` provides better UX
- Edge Function checks job status before starting to handle race conditions
- Optimistic locking not needed (status transitions are append-only)

### 6.6 Data Exposure

- Job records include sensitive data (costs, API params) - only expose to owner via RLS
- Do not expose `owner_user_id` in responses (indirect relationship)
- Do not log LLM API responses in telemetry (may contain PII)

### 6.7 Rate Limiting

- Supabase built-in rate limiting per IP address
- Consider implementing per-user rate limiting for job creation (e.g., 10 jobs per hour)
- OpenRouter.ai has its own rate limits - Edge Function should handle 429 responses with backoff

### 6.8 Polling Attack Prevention

- Frontend enforces minimum 2-second polling interval
- TanStack Query prevents duplicate simultaneous requests with same key
- Consider server-side rate limiting on job status queries (100 req/min per user)
- Use Supabase Realtime subscriptions as alternative to polling (future enhancement)

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Invalid UUID format for project_id or job_id
- Missing required fields (target_locale, mode, key_ids)
- Invalid mode value
- `key_ids` empty for `selected`/`single` mode
- `key_ids` non-empty for `all` mode
- `key_ids` contains non-UUID values
- Invalid params (temperature > 1, negative max_tokens)
- target_locale not in BCP-47 format

**Handling:**

```typescript
try {
  const validatedData = createTranslationJobSchema.parse(formData);
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

### 7.2 Business Logic Errors (400)

**Trigger Conditions:**

- target_locale is project's default locale (violates business rule)
- Attempt to cancel job with status `completed`, `failed`, or `cancelled`

**Handling:**

Edge Function validates target locale against project default locale:

```typescript
const { data: project } = await supabase
  .from('projects')
  .select('default_locale')
  .eq('id', validatedData.project_id)
  .single();

if (validatedData.target_locale === project.default_locale) {
  return {
    error: {
      code: 'validation_error',
      message: 'Target locale cannot be the default locale',
    },
  };
}
```

### 7.3 Authentication Errors (401)

**Trigger Conditions:**

- Missing Authorization header
- Expired JWT token
- Invalid JWT signature
- Revoked token

**Handling:**

- Supabase client automatically handles token refresh
- If refresh fails, redirect user to login page
- Display "Session expired, please log in again" message

### 7.4 Authorization Errors (403)

**Trigger Conditions:**

- User attempts to create job for project owned by another user
- User attempts to cancel job for project owned by another user
- RLS policy denies access

**Handling:**

- Supabase returns empty result set or error
- Return 403 "Project not owned by user" to be explicit
- Edge Function checks project ownership before proceeding

### 7.5 Not Found Errors (404)

**Trigger Conditions:**

- Project ID doesn't exist
- Job ID doesn't exist
- RLS policy denies access (appears as not found)

**Handling:**

```typescript
const { data, error } = await supabase.from('translation_jobs').select('*').eq('id', jobId).maybeSingle();

if (!data) {
  return {
    error: {
      code: 'not_found',
      message: 'Translation job not found or access denied',
    },
  };
}
```

### 7.6 Conflict Errors (409)

**Trigger Conditions:**

- Another job is already active (pending/running) for this project
- Database trigger `prevent_multiple_active_jobs_trigger` raises exception

**Handling:**

```typescript
const { data, error } = await supabase.functions.invoke('translate', {
  body: validatedData,
});

if (error) {
  if (error.message.includes('active job')) {
    return {
      error: {
        code: 'conflict',
        message: 'Another translation job is already active for this project',
      },
    };
  }
}
```

**Frontend Prevention:**

- Check for active job before showing translation dialog
- Disable translation button if active job exists
- Show progress modal if active job exists

### 7.7 Edge Function Errors (500)

**Trigger Conditions:**

- OpenRouter API error (network failure, rate limit, invalid API key)
- Database connection failure during job processing
- Unexpected error in translation loop
- Invalid LLM response format

**Handling:**

Edge Function implements comprehensive error handling:

```typescript
try {
  // Create job record
  // Process translations
} catch (error) {
  console.error('[translate] Edge Function error:', error);

  // Update job status to 'failed'
  await supabase
    .from('translation_jobs')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  // Return generic error
  return {
    error: {
      code: 'internal_server_error',
      message: 'Translation job failed due to unexpected error',
    },
  };
}
```

**Partial Success Handling:**

- If some translations succeed before error, they are kept
- Job status set to `failed` with `completed_keys` and `failed_keys` counts
- User can view which keys failed and retry them

### 7.8 OpenRouter API Errors

**Trigger Conditions:**

- Rate limit exceeded (429)
- Invalid API key (401)
- Model not available (503)
- Timeout (408)
- Invalid response format

**Handling:**

Implement retry logic with exponential backoff:

```typescript
async function translateWithRetry(text: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        // ... config
      });

      if (response.status === 429) {
        // Rate limit - wait and retry
        await sleep(2 ** i * 1000);
        continue;
      }

      if (!response.ok) {
        throw new Error(`OpenRouter error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(2 ** i * 1000);
    }
  }
}
```

**Update job item status to `failed` if all retries exhausted.**

### 7.9 Network Errors (Client)

**Trigger Conditions:**

- Lost internet connection
- Supabase service unavailable
- Request timeout
- Edge Function timeout

**Handling:**

- TanStack Query automatically retries failed requests (3 retries with exponential backoff)
- Display network error message with retry button
- For job creation, show "Job creation failed. Please try again."
- For polling, continue retrying in background (job may still be processing)

### 7.10 Cancellation Edge Cases

**Scenario 1: Cancel after completion**

- User clicks cancel just as job finishes
- Database constraint prevents status change from `completed` to `cancelled`
- Return 400 "Cannot cancel completed job"

**Scenario 2: Concurrent cancellation**

- Multiple users/tabs attempt to cancel same job
- First request succeeds, subsequent requests see `status = 'cancelled'`
- Return 400 "Job already cancelled"

**Scenario 3: Cancel during Edge Function processing**

- Edge Function checks `status` before each translation
- When `cancelled` detected, gracefully stop and update counters
- Partially completed translations are preserved

## 8. Performance Considerations

### 8.1 Query Optimization

**Indexing:**

- Composite index on `(project_id, status)` for fast active job lookup (defined in `supabase/migrations/20251013143200_create_indexes.sql`)
- Index on `project_id` for job history queries
- Index on `created_at` for sorting
- Foreign key indexes on `translation_job_items.job_id` and `translation_job_items.key_id`

**Selective Fetching:**

- Active job check only fetches required fields: `id, status, completed_keys, total_keys, failed_keys`
- List query excludes `params` field to reduce payload size (use `select` to include if needed)
- Use `.maybeSingle()` for single job queries to optimize response

### 8.2 Polling Optimization

**TanStack Query Configuration:**

```typescript
// Active job check: 0ms staleTime (always fresh)
staleTime: 0,
refetchInterval: 2000, // Poll every 2 seconds while active

// Job list: 5-minute cache
staleTime: 5 * 60 * 1000,
gcTime: 10 * 60 * 1000,
```

**Conditional Polling:**

```typescript
refetchInterval: (data) => {
  const activeJob = data?.[0];
  if (!activeJob || isFinishedJob(activeJob)) {
    return false; // Stop polling
  }
  return 2000; // Continue polling
},
```

**Future Enhancement: Realtime Subscriptions**

Replace polling with Supabase Realtime:

```typescript
supabase
  .channel(`job:${jobId}`)
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'translation_jobs', filter: `id=eq.${jobId}` },
    (payload) => {
      // Update UI with new job status
    }
  )
  .subscribe();
```

### 8.3 Edge Function Performance

**Batch Processing:**

- Process translations in batches of 10 concurrent requests (using Promise.all)
- Use connection pooling for database queries
- Implement timeout per translation (30 seconds max)

**OpenRouter Optimization:**

- Use streaming responses for faster feedback (future enhancement)
- Cache frequently translated phrases (future enhancement)
- Use cheaper models for simple translations (future enhancement)

### 8.4 Caching Strategy

**TanStack Query Configuration:**

```typescript
// Active job: No cache (always fetch fresh)
staleTime: 0,
gcTime: 0,

// Job list: Medium cache
staleTime: 5 * 60 * 1000,
gcTime: 10 * 60 * 1000,

// Single job: Short cache (during polling)
staleTime: 2 * 1000,
gcTime: 5 * 60 * 1000,
```

**Cache Invalidation:**

- Create job → invalidate active job cache, invalidate job list cache
- Cancel job → invalidate active job cache, invalidate single job cache
- Job completion → invalidate active job cache, invalidate translations cache

### 8.5 Request Debouncing

**Cancel Button:**

- Debounce cancel button by 300ms to prevent accidental double-clicks
- Show confirmation dialog before cancelling

**Polling:**

- Use TanStack Query's built-in request deduplication
- Don't start new poll request if previous one still pending

### 8.6 Database Performance

**Connection Pooling:**

- Edge Functions use Supabase connection pooler for efficient database access
- Avoid long-running transactions during translation processing
- Commit after each translation to minimize lock duration

**Telemetry Event Optimization:**

- Emit telemetry events asynchronously (don't block job completion)
- Use partitioned table for efficient telemetry queries

### 8.7 Payload Size

- Typical active job check response: ~300 bytes
- Typical job list response (20 items): ~10-15 KB
- Job creation request: ~200 bytes
- Compression (gzip) enabled by default in Supabase

### 8.8 Edge Function Timeout

- Supabase Edge Functions have 150-second timeout
- For large translation jobs (1000+ keys), implement chunking:
  - Process 100 keys per Edge Function invocation
  - Create continuation job for remaining keys
  - Frontend continues polling across multiple invocations

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

```bash
mkdir -p src/features/translation-jobs/{api,components,routes,hooks,types}
```

### Step 2: Create Type Definitions

Create `src/features/translation-jobs/types.ts`:

```typescript
export interface TranslationProgress {
  completed: number;
  failed: number;
  isActive: boolean;
  jobId: string;
  percentage: number;
  status: JobStatus;
  total: number;
}
```

### Step 3: Create Zod Validation Schemas

Create `src/features/translation-jobs/api/translation-jobs.schemas.ts` with all validation schemas defined in section 3.2.

### Step 4: Create TanStack Query Hooks

**4.1 Create `src/features/translation-jobs/api/useCheckActiveJob.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { checkActiveJobSchema } from './translation-jobs.schemas';
import type { TranslationJobResponse, ApiError } from '@/shared/types';

export const translationJobsKeys = {
  all: ['translation-jobs'] as const,
  lists: () => [...translationJobsKeys.all, 'list'] as const,
  list: (projectId: string) => [...translationJobsKeys.lists(), projectId] as const,
  active: (projectId: string) => [...translationJobsKeys.all, 'active', projectId] as const,
  details: () => [...translationJobsKeys.all, 'detail'] as const,
  detail: (id: string) => [...translationJobsKeys.details(), id] as const,
};

export function useCheckActiveJob(projectId: string) {
  const supabase = useSupabase();

  return useQuery<TranslationJobResponse | null, ApiError>({
    queryKey: translationJobsKeys.active(projectId),
    queryFn: async () => {
      const validated = checkActiveJobSchema.parse({ project_id: projectId });

      const { data, error } = await supabase
        .from('translation_jobs')
        .select(
          'id,status,mode,source_locale,target_locale,total_keys,completed_keys,failed_keys,started_at,created_at'
        )
        .eq('project_id', validated.project_id)
        .in('status', ['pending', 'running'])
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useCheckActiveJob] Query error:', error);
        throw {
          error: {
            code: 'database_error',
            message: 'Failed to check active job',
            details: { original: error },
          },
        };
      }

      return data;
    },
    staleTime: 0, // Always fetch fresh
    gcTime: 0, // Don't keep in cache
  });
}
```

**4.2 Create `src/features/translation-jobs/api/useTranslationJobs.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { listTranslationJobsSchema } from './translation-jobs.schemas';
import { translationJobsKeys } from './useCheckActiveJob';
import type { ListTranslationJobsParams, TranslationJobResponse, ApiError } from '@/shared/types';

export function useTranslationJobs(params: ListTranslationJobsParams) {
  const supabase = useSupabase();

  return useQuery<TranslationJobResponse[], ApiError>({
    queryKey: translationJobsKeys.list(params.project_id),
    queryFn: async () => {
      const validated = listTranslationJobsSchema.parse(params);

      let query = supabase
        .from('translation_jobs')
        .select('*')
        .eq('project_id', validated.project_id)
        .order('created_at', { ascending: false })
        .range(validated.offset || 0, (validated.offset || 0) + (validated.limit || 20) - 1);

      if (validated.status) {
        if (Array.isArray(validated.status)) {
          query = query.in('status', validated.status);
        } else {
          query = query.eq('status', validated.status);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useTranslationJobs] Query error:', error);
        throw {
          error: {
            code: 'database_error',
            message: 'Failed to fetch translation jobs',
            details: { original: error },
          },
        };
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

**4.3 Create `src/features/translation-jobs/api/useCreateTranslationJob.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createTranslationJobSchema } from './translation-jobs.schemas';
import { translationJobsKeys } from './useCheckActiveJob';
import type { CreateTranslationJobRequest, CreateTranslationJobResponse, ApiError } from '@/shared/types';

export function useCreateTranslationJob() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<CreateTranslationJobResponse, ApiError, CreateTranslationJobRequest>({
    mutationFn: async (jobData) => {
      // Validate input
      const validated = createTranslationJobSchema.parse(jobData);

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke<CreateTranslationJobResponse>('translate', {
        body: validated,
      });

      if (error) {
        console.error('[useCreateTranslationJob] Edge Function error:', error);

        // Handle conflict (active job exists)
        if (error.message.includes('active job') || error.message.includes('already running')) {
          throw {
            error: {
              code: 'conflict',
              message: 'Another translation job is already active for this project',
            },
          };
        }

        // Handle validation errors from Edge Function
        if (error.message.includes('default locale')) {
          throw {
            error: {
              code: 'validation_error',
              message: 'Target locale cannot be the default locale',
            },
          };
        }

        // Generic error
        throw {
          error: {
            code: 'internal_server_error',
            message: 'Failed to create translation job',
            details: { original: error },
          },
        };
      }

      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate active job cache
      queryClient.invalidateQueries({ queryKey: translationJobsKeys.active(variables.project_id) });
      // Invalidate job list cache
      queryClient.invalidateQueries({ queryKey: translationJobsKeys.list(variables.project_id) });
    },
  });
}
```

**4.4 Create `src/features/translation-jobs/api/useCancelTranslationJob.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { cancelTranslationJobSchema } from './translation-jobs.schemas';
import { translationJobsKeys } from './useCheckActiveJob';
import type { CancelTranslationJobRequest, TranslationJobResponse, ApiError } from '@/shared/types';

export function useCancelTranslationJob() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<TranslationJobResponse, ApiError, { id: string } & CancelTranslationJobRequest>({
    mutationFn: async ({ id, status }) => {
      // Validate input
      const validated = cancelTranslationJobSchema.parse({ id, status });

      // First check if job is in cancellable state
      const { data: currentJob, error: fetchError } = await supabase
        .from('translation_jobs')
        .select('status,project_id')
        .eq('id', validated.id)
        .maybeSingle();

      if (fetchError) {
        console.error('[useCancelTranslationJob] Fetch error:', fetchError);
        throw {
          error: {
            code: 'database_error',
            message: 'Failed to fetch job',
            details: { original: fetchError },
          },
        };
      }

      if (!currentJob) {
        throw {
          error: {
            code: 'not_found',
            message: 'Translation job not found or access denied',
          },
        };
      }

      if (currentJob.status !== 'pending' && currentJob.status !== 'running') {
        throw {
          error: {
            code: 'invalid_state',
            message: `Cannot cancel job with status '${currentJob.status}'`,
          },
        };
      }

      // Update status to cancelled
      const { data, error } = await supabase
        .from('translation_jobs')
        .update({
          status: 'cancelled',
          finished_at: new Date().toISOString(),
        })
        .eq('id', validated.id)
        .select('id,status,finished_at')
        .single();

      if (error) {
        console.error('[useCancelTranslationJob] Update error:', error);
        throw {
          error: {
            code: 'internal_server_error',
            message: 'Failed to cancel translation job',
            details: { original: error },
          },
        };
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Get project_id from cache or optimistically
      const activeJobData = queryClient.getQueryData<TranslationJobResponse>(translationJobsKeys.detail(variables.id));
      const projectId = activeJobData?.project_id;

      if (projectId) {
        // Invalidate active job cache
        queryClient.invalidateQueries({ queryKey: translationJobsKeys.active(projectId) });
        // Invalidate job list cache
        queryClient.invalidateQueries({ queryKey: translationJobsKeys.list(projectId) });
      }
      // Invalidate single job cache
      queryClient.invalidateQueries({ queryKey: translationJobsKeys.detail(variables.id) });
    },
  });
}
```

### Step 5: Create Custom Progress Hook

Create `src/features/translation-jobs/hooks/useTranslationProgress.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { translationJobsKeys } from '../api/useCheckActiveJob';
import { isFinishedJob } from '@/shared/types';
import type { TranslationProgress, TranslationJobResponse, ApiError } from '@/shared/types';

export function useTranslationProgress(jobId: string | null) {
  const supabase = useSupabase();

  return useQuery<TranslationProgress | null, ApiError>({
    queryKey: translationJobsKeys.detail(jobId || ''),
    queryFn: async () => {
      if (!jobId) return null;

      const { data, error } = await supabase
        .from('translation_jobs')
        .select('id,status,total_keys,completed_keys,failed_keys,project_id')
        .eq('id', jobId)
        .maybeSingle();

      if (error) {
        console.error('[useTranslationProgress] Query error:', error);
        throw {
          error: {
            code: 'database_error',
            message: 'Failed to fetch job progress',
            details: { original: error },
          },
        };
      }

      if (!data) {
        throw {
          error: {
            code: 'not_found',
            message: 'Translation job not found',
          },
        };
      }

      const percentage = data.total_keys > 0 ? Math.round((data.completed_keys / data.total_keys) * 100) : 0;
      const isActive = !isFinishedJob(data);

      return {
        jobId: data.id,
        status: data.status,
        total: data.total_keys,
        completed: data.completed_keys,
        failed: data.failed_keys,
        percentage,
        isActive,
      };
    },
    enabled: !!jobId,
    staleTime: 0,
    refetchInterval: (data) => {
      // Stop polling when job finishes
      if (!data || !data.isActive) {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });
}
```

### Step 6: Create API Index File

Create `src/features/translation-jobs/api/index.ts`:

```typescript
export { useCheckActiveJob, translationJobsKeys } from './useCheckActiveJob';
export { useTranslationJobs } from './useTranslationJobs';
export { useCreateTranslationJob } from './useCreateTranslationJob';
export { useCancelTranslationJob } from './useCancelTranslationJob';
export * from './translation-jobs.schemas';
```

### Step 7: Create Supabase Edge Function

Create `supabase/functions/translate/index.ts`:

**Note:** This is a complex Edge Function with LLM integration. Key implementation points:

1. Import Supabase client and OpenRouter client
2. Validate request body using Zod schema
3. Verify project ownership via RLS
4. Check target locale is not default locale
5. Create `translation_jobs` record with `status = 'pending'`
6. Determine key set based on mode
7. Create `translation_job_items` records
8. Update job status to `running`
9. Iterate through keys:
   - Fetch source value
   - Call OpenRouter API
   - Parse response
   - Update `translations` table
   - Update `translation_job_items` status
   - Check cancellation flag
10. Update job status to `completed`/`failed`
11. Emit telemetry event
12. Return 202 response with job_id

**Refer to existing Edge Function patterns in the codebase for implementation details.**

### Step 8: Write Unit Tests for Hooks

**8.1 Create `src/features/translation-jobs/api/useCheckActiveJob.test.ts`:**

Test scenarios:

- Successful check with active job
- Successful check with no active job
- Invalid project ID format
- Database error handling

**8.2 Create `src/features/translation-jobs/api/useTranslationJobs.test.ts`:**

Test scenarios:

- Successful list with default params
- Successful list with pagination
- Successful list with status filter
- Empty result handling

**8.3 Create `src/features/translation-jobs/api/useCreateTranslationJob.test.ts`:**

Test scenarios:

- Successful job creation (all modes)
- Validation error (invalid key_ids for mode)
- Conflict error (active job exists)
- Target locale is default locale error
- Database error

**8.4 Create `src/features/translation-jobs/api/useCancelTranslationJob.test.ts`:**

Test scenarios:

- Successful cancellation
- Invalid job ID format
- Job not in cancellable state (400)
- Job not found (404)
- Cache invalidation verification

**8.5 Create `src/features/translation-jobs/hooks/useTranslationProgress.test.ts`:**

Test scenarios:

- Progress calculation
- Polling starts and stops correctly
- Handles finished jobs
- Null job ID handling

### Step 9: Create UI Components

**9.1 Create `src/features/translation-jobs/components/TranslationJobList.tsx`:**

Component that displays job history table with status badges, cost info, and action buttons.

**9.2 Create `src/features/translation-jobs/components/CreateTranslationJobDialog.tsx`:**

Modal dialog with form for creating translation job:

- Target locale selector
- Mode radio buttons (all/selected/single)
- Key multi-select (conditionally shown)
- LLM params expander (optional)
- Cost estimate display
- Submit button (disabled if active job exists)

**9.3 Create `src/features/translation-jobs/components/TranslationProgressModal.tsx`:**

Modal that shows:

- Progress bar with percentage
- Completed/Failed/Total counters
- Cancel button
- Estimated time remaining
- Auto-closes on completion

**9.4 Create `src/features/translation-jobs/components/JobStatusBadge.tsx`:**

Reusable badge component with color-coded status display.

### Step 10: Create Route Components

**10.1 Create `src/features/translation-jobs/routes/TranslationJobsPage.tsx`:**

Page that renders `TranslationJobList` for a specific project.

**10.2 Integration with existing project pages:**

- Add "Translate" button to project keys page
- Button opens `CreateTranslationJobDialog`
- Button disabled if active job exists
- Show `TranslationProgressModal` if active job exists

### Step 11: Register Routes

Update `src/app/routes.ts` to include translation jobs page:

```typescript
{
  path: '/projects/:projectId/translations/jobs',
  lazy: () => import('@/features/translation-jobs/routes/TranslationJobsPage'),
},
```

### Step 12: Add Component Tests

Write tests for each component using Testing Library:

- User interactions (form submission, mode selection, cancellation)
- Loading states
- Error states
- Progress updates
- Polling behavior

### Step 13: Integration Testing

Test complete user flows:

1. User creates translation job → sees progress modal → job completes → translations updated
2. User creates job with selected keys → only those keys translated
3. User attempts to create second job while first active → sees conflict error
4. User cancels running job → job stops → partial translations kept
5. User views job history → sees cost metrics and status

### Step 14: Edge Function Testing

Test Edge Function with:

- Mock OpenRouter API responses
- Various translation modes
- Error scenarios (API failures, timeouts)
- Cancellation during processing
- Cost calculation accuracy

### Step 15: Performance Testing

- Test polling with multiple concurrent users
- Verify index usage with EXPLAIN ANALYZE
- Test Edge Function with large key sets (1000+ keys)
- Monitor OpenRouter API latency
- Check database connection pool usage

### Step 16: Documentation

**16.1 Add JSDoc comments to all hooks and components**

**16.2 Create `src/features/translation-jobs/README.md`:**

Document:

- Feature overview
- Translation modes explanation
- LLM configuration options
- Polling mechanism details
- Cost calculation methodology
- Error handling strategies

### Step 17: Security Audit

- Verify RLS policies enforce project ownership
- Test unauthorized access attempts
- Validate input sanitization in Edge Function
- Check API key protection
- Test rate limiting effectiveness

### Step 18: Accessibility Review

- Ensure progress modal is keyboard accessible
- Test screen reader compatibility
- Verify ARIA labels on status badges
- Check focus management during polling
- Test high contrast mode

### Step 19: Final Review and Deployment

- Run `npm run lint` and fix any issues
- Run `npm run test` and ensure comprehensive coverage
- Deploy Edge Function to Supabase
- Update environment variables for OpenRouter API key
- Create pull request with detailed description
- Request code review from team members
- Merge and deploy to staging environment
- Monitor error tracking and performance metrics
- Test in production with real OpenRouter API calls
