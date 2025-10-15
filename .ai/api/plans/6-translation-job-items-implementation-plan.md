# API Endpoint Implementation Plan: Get Translation Job Items

## 1. Endpoint Overview

The Translation Job Items endpoint provides detailed item-level status information for a specific translation job. It allows users to inspect which keys were successfully translated, which failed, and the specific error details for failed translations. This endpoint is primarily used for debugging translation failures and monitoring job progress at a granular level.

### Key Features

- Retrieve all items for a specific translation job
- Include embedded key information (full_key) for context
- Display status for each item (pending, completed, failed)
- Expose error codes and messages for failed items
- Enforce RLS policies to ensure users only access their own job items

### Endpoint Summary

**Get Translation Job Items** - `GET /rest/v1/translation_job_items?job_id=eq.{job_id}&select=*,keys(full_key)`

## 2. Request Details

### 2.1 Get Translation Job Items

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/translation_job_items?job_id=eq.{job_id}&select=*,keys(full_key)`
- **Authentication:** Required (JWT via Authorization header)
- **Parameters:**
  - Required:
    - `job_id` (UUID) - Translation job ID (via query filter)
  - Optional:
    - `select` (string) - Columns to return (default: `*,keys(full_key)`)
    - `order` (string) - Sort order (e.g., `created_at.asc`, `status.desc`)
- **Request Body:** None

**Example Request:**

```http
GET /rest/v1/translation_job_items?job_id=eq.550e8400-e29b-41d4-a716-446655440000&select=*,keys(full_key)
Authorization: Bearer {access_token}
```

**Query Parameters Breakdown:**

- `job_id=eq.{job_id}` - Supabase filter syntax for exact match
- `select=*,keys(full_key)` - Select all columns from `translation_job_items` and embed `full_key` from related `keys` table

## 3. Used Types

### 3.1 Existing Types (from `src/shared/types/types.ts`)

```typescript
// Response DTOs
export type TranslationJobItem = Tables<'translation_job_items'>;

export type TranslationJobItemResponse = TranslationJobItem & {
  keys: {
    full_key: string;
  };
};

// Enum types
export type ItemStatus = Enums<'item_status'>; // 'pending' | 'completed' | 'failed'

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

### 3.2 New Zod Validation Schemas

Create validation schemas in `src/features/translation-jobs/api/translation-job-items.schemas.ts`:

```typescript
import { z } from 'zod';

// Job ID validation
export const jobIdSchema = z.string().uuid('Invalid job ID format');

// Query parameters schema
export const getJobItemsParamsSchema = z.object({
  job_id: jobIdSchema,
  order: z
    .enum(['created_at.asc', 'created_at.desc', 'status.asc', 'status.desc', 'updated_at.asc', 'updated_at.desc'])
    .optional()
    .default('created_at.asc'),
});
```

## 4. Response Details

### 4.1 Get Translation Job Items

**Success Response (200 OK):**

```json
[
  {
    "created_at": "2025-01-15T10:15:00Z",
    "error_code": null,
    "error_message": null,
    "id": "uuid",
    "job_id": "uuid",
    "key_id": "uuid",
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
    "id": "uuid",
    "job_id": "uuid",
    "key_id": "uuid",
    "keys": {
      "full_key": "app.home.subtitle"
    },
    "status": "failed",
    "updated_at": "2025-01-15T10:17:00Z"
  }
]
```

**Response Fields:**

- `id` (UUID) - Unique item identifier
- `job_id` (UUID) - Parent translation job ID
- `key_id` (UUID) - Reference to translation key
- `status` (ItemStatus) - Item status: `pending`, `completed`, or `failed`
- `error_code` (string | null) - OpenRouter error code (e.g., `rate_limit`, `model_error`, `invalid_request`)
- `error_message` (string | null) - Human-readable error description
- `created_at` (timestamp) - Item creation time
- `updated_at` (timestamp) - Last status update time
- `keys.full_key` (string) - Full dotted key path (e.g., `app.home.title`)

### 4.2 Error Responses

**400 Bad Request (Invalid Job ID):**

```json
{
  "error": {
    "code": "validation_error",
    "details": {
      "constraint": "uuid",
      "field": "job_id"
    },
    "message": "Invalid job ID format"
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

**403 Forbidden (Job Not Owned by User):**

```json
{
  "error": {
    "code": "forbidden",
    "message": "Job's project not owned by user"
  }
}
```

**404 Not Found (Job Doesn't Exist):**

For security reasons, return 404 instead of 403 to avoid leaking information about job existence:

```json
{
  "error": {
    "code": "not_found",
    "message": "Translation job not found or access denied"
  }
}
```

**500 Internal Server Error:**

```json
{
  "error": {
    "code": "internal_server_error",
    "message": "An unexpected error occurred. Please try again."
  }
}
```

## 5. Data Flow

### 5.1 Get Translation Job Items Flow

1. User navigates to translation job detail page or clicks "View Details" button
2. React component invokes `useTranslationJobItems` hook with `job_id`
3. Hook validates `job_id` format using Zod schema
4. If validation fails, return 400 error immediately
5. Hook retrieves Supabase client from `useSupabase()` context
6. Hook calls Supabase with filter: `.from('translation_job_items').select('*,keys(full_key)').eq('job_id', jobId)`
7. Supabase RLS policy verifies ownership chain:
   - Join `translation_job_items` → `translation_jobs` → `projects`
   - Check `projects.owner_user_id = auth.uid()`
8. If RLS denies access, Supabase returns empty result → hook returns 404 error
9. If authorized, PostgreSQL executes query with LEFT JOIN to `keys` table
10. Results include all items with embedded key information
11. Data is returned and cached by TanStack Query
12. Component renders job items list with status indicators and error details
13. For active jobs, component may poll for updates or subscribe to real-time changes

## 6. Security Considerations

### 6.1 Authentication

- All requests require valid JWT access token in `Authorization: Bearer {token}` header
- Token is obtained via Supabase Auth during sign-in
- Token is stored in Supabase client session and automatically included in requests
- Token expiration is handled by Supabase client with automatic refresh

### 6.2 Authorization

- RLS policies enforce ownership through the chain: `translation_job_items` → `translation_jobs` → `projects` → `owner_user_id`
- Users can only access job items for jobs belonging to their own projects
- RLS policy is defined in `supabase/migrations/20251013143400_create_rls_policies.sql`
- Policy name: `translation_job_items_select_policy` - enforces ownership check via JOIN

**RLS Policy Logic:**

```sql
CREATE POLICY translation_job_items_select_policy ON translation_job_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM translation_jobs
    JOIN projects ON projects.id = translation_jobs.project_id
    WHERE translation_jobs.id = translation_job_items.job_id
      AND projects.owner_user_id = auth.uid()
  )
);
```

### 6.3 Input Validation

- **Client-side validation:** Zod schema validates `job_id` format before sending request
- **Database-level validation:** Foreign key constraints ensure `job_id` references valid job
- **Format validation:** UUID format validation prevents injection attacks

### 6.4 Data Exposure

- Only expose job items for jobs owned by the authenticated user
- Error codes and messages are safe to expose (from OpenRouter API)
- Do not expose internal database errors or stack traces
- Return generic error messages for unexpected failures

### 6.5 Rate Limiting

- Supabase provides built-in rate limiting per IP address
- For active jobs, implement client-side polling throttling (minimum 2-3 second intervals)
- Consider using real-time subscriptions instead of polling for better performance

### 6.6 SQL Injection Prevention

- Supabase client uses parameterized queries for all operations
- Never construct raw SQL strings from user input
- UUID validation prevents injection attempts

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Invalid `job_id` format (not a valid UUID)
- Malformed query parameters

**Handling:**

```typescript
try {
  const validated = getJobItemsParamsSchema.parse({ job_id: jobId });
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

### 7.3 Authorization/Not Found Errors (403/404)

**Trigger Conditions:**

- User attempts to access job items for a job belonging to another user's project
- Job ID doesn't exist
- RLS policy denies access

**Handling:**

- Supabase returns empty result set when RLS denies access
- Return 404 "Translation job not found or access denied" to avoid leaking job existence
- Do not distinguish between "doesn't exist" and "access denied" for security

**Implementation:**

```typescript
const { data, error } = await supabase
  .from('translation_job_items')
  .select('*,keys(full_key)')
  .eq('job_id', validatedJobId);

if (error) {
  console.error('[useTranslationJobItems] Query error:', error);
  throw {
    error: {
      code: 'database_error',
      message: 'Failed to fetch job items',
      details: { original: error },
    },
  };
}

// Empty result could mean job doesn't exist or access denied
if (!data || data.length === 0) {
  // Verify job exists and check ownership explicitly
  const { data: job } = await supabase.from('translation_jobs').select('id').eq('id', validatedJobId).maybeSingle();

  if (!job) {
    throw {
      error: {
        code: 'not_found',
        message: 'Translation job not found or access denied',
      },
    };
  }
}

return data;
```

### 7.4 Database Errors (500)

**Trigger Conditions:**

- Database connection failure
- Query execution timeout
- Foreign key constraint violations (should not happen in normal operation)
- Unexpected database errors

**Handling:**

- Log full error details to console (development) or error tracking service (production)
- Return generic message to user: "An unexpected error occurred. Please try again."
- Do not expose internal error details to client

**Example:**

```typescript
const { data, error } = await supabase
  .from('translation_job_items')
  .select('*,keys(full_key)')
  .eq('job_id', validatedJobId);

if (error) {
  console.error('[useTranslationJobItems] Query error:', error);

  // Send to error tracking (e.g., Sentry)
  if (import.meta.env.PROD) {
    trackError(error);
  }

  throw {
    error: {
      code: 'internal_server_error',
      message: 'An unexpected error occurred. Please try again.',
    },
  };
}
```

### 7.5 Network Errors

**Trigger Conditions:**

- Lost internet connection
- Supabase service unavailable
- Request timeout

**Handling:**

- TanStack Query automatically retries failed requests (3 retries with exponential backoff)
- Display network error message with retry button
- Cache last successful data to show stale content during network issues

## 8. Performance Considerations

### 8.1 Query Optimization

**Indexing:**

- Primary key index on `id` (auto-created)
- Index on `job_id` for efficient filtering (defined in `supabase/migrations/20251013143200_create_indexes.sql`)
- Foreign key indexes on `job_id` and `key_id` for fast joins
- Composite unique index on `(job_id, key_id)` prevents duplicates

**Join Optimization:**

- Query uses LEFT JOIN to embed `keys.full_key`
- Single query fetches all related data (no N+1 problem)
- Supabase uses PostgREST's efficient embedding mechanism

**Expected Query Performance:**

- Typical job has 10-100 items
- Query execution time: < 50ms
- Network transfer: 2-20 KB depending on item count

### 8.2 Caching Strategy

**TanStack Query Configuration:**

```typescript
// Job items: 3-minute cache for active jobs, 10-minute for completed
staleTime: job.status === 'pending' || job.status === 'running' ? 3 * 60 * 1000 : 10 * 60 * 1000,
gcTime: 15 * 60 * 1000, // 15 minutes
```

**Cache Invalidation:**

- When job status changes from `pending` to `running`: invalidate cache
- When job status changes from `running` to `completed`/`failed`/`cancelled`: invalidate cache
- When individual item status updates: invalidate job items cache
- Manual refetch button for user-initiated updates

### 8.3 Real-Time Updates (Optional Enhancement)

For active jobs, consider implementing real-time subscriptions:

```typescript
// Subscribe to job item changes for active jobs
const subscription = supabase
  .channel(`job_items_${jobId}`)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'translation_job_items', filter: `job_id=eq.${jobId}` },
    (payload) => {
      // Invalidate cache when items update
      queryClient.invalidateQueries({ queryKey: translationJobsKeys.jobItems(jobId) });
    }
  )
  .subscribe();
```

### 8.4 Payload Size

- Typical item: ~150 bytes (including embedded key)
- 100 items: ~15 KB
- 1000 items: ~150 KB (rare, but possible for large translation jobs)
- Compression (gzip) enabled by default in Supabase reduces payload by ~70%

### 8.5 Pagination Considerations

Current implementation returns all items for a job. For very large jobs (1000+ items), consider implementing pagination:

- Add `limit` and `offset` parameters
- Default limit: 100 items
- Return `Content-Range` header with total count
- Implement "Load more" or infinite scroll UI

### 8.6 Polling vs Real-Time Subscriptions

**Polling (Current Approach):**

- Simple to implement
- Works with TanStack Query refetch intervals
- Recommended interval: 5 seconds for active jobs, disabled for completed jobs

**Real-Time Subscriptions (Future Enhancement):**

- More efficient (push-based instead of pull-based)
- Instant updates when item status changes
- Requires WebSocket connection
- Better user experience for long-running jobs

## 9. Implementation Steps

### Step 1: Create Validation Schemas

Create `src/features/translation-jobs/api/translation-job-items.schemas.ts`:

```typescript
import { z } from 'zod';

// Job ID validation
export const jobIdSchema = z.string().uuid('Invalid job ID format');

// Query parameters schema
export const getJobItemsParamsSchema = z.object({
  job_id: jobIdSchema,
  order: z
    .enum(['created_at.asc', 'created_at.desc', 'status.asc', 'status.desc', 'updated_at.asc', 'updated_at.desc'])
    .optional()
    .default('created_at.asc'),
});
```

### Step 2: Create TanStack Query Hook

Create `src/features/translation-jobs/api/useTranslationJobItems.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { getJobItemsParamsSchema } from './translation-job-items.schemas';
import type { TranslationJobItemResponse, ApiError } from '@/shared/types';

export const translationJobItemsKeys = {
  all: ['translation-job-items'] as const,
  lists: () => [...translationJobItemsKeys.all, 'list'] as const,
  list: (jobId: string) => [...translationJobItemsKeys.lists(), jobId] as const,
};

interface UseTranslationJobItemsParams {
  jobId: string;
  order?: 'created_at.asc' | 'created_at.desc' | 'status.asc' | 'status.desc' | 'updated_at.asc' | 'updated_at.desc';
}

export function useTranslationJobItems({ jobId, order = 'created_at.asc' }: UseTranslationJobItemsParams) {
  const supabase = useSupabase();

  return useQuery<TranslationJobItemResponse[], ApiError>({
    queryKey: translationJobItemsKeys.list(jobId),
    queryFn: async () => {
      // Validate parameters
      const validated = getJobItemsParamsSchema.parse({ job_id: jobId, order });

      // Extract order field and direction
      const [orderField, orderDirection] = validated.order.split('.') as [string, 'asc' | 'desc'];

      // Query job items with embedded key information
      const { data, error } = await supabase
        .from('translation_job_items')
        .select('*,keys(full_key)')
        .eq('job_id', validated.job_id)
        .order(orderField, { ascending: orderDirection === 'asc' });

      if (error) {
        console.error('[useTranslationJobItems] Query error:', error);
        throw {
          error: {
            code: 'database_error',
            message: 'Failed to fetch translation job items',
            details: { original: error },
          },
        };
      }

      // Check if job exists (empty result could mean no items or access denied)
      if (!data || data.length === 0) {
        // Verify job exists and user has access
        const { data: job, error: jobError } = await supabase
          .from('translation_jobs')
          .select('id')
          .eq('id', validated.job_id)
          .maybeSingle();

        if (jobError || !job) {
          throw {
            error: {
              code: 'not_found',
              message: 'Translation job not found or access denied',
            },
          };
        }

        // Job exists but has no items yet (valid state for newly created jobs)
        return [];
      }

      return data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2, // Retry twice on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}
```

### Step 3: Add Hook to API Index

Update `src/features/translation-jobs/api/index.ts`:

```typescript
export { useTranslationJobItems, translationJobItemsKeys } from './useTranslationJobItems';
export * from './translation-job-items.schemas';
```

### Step 4: Write Unit Tests

Create `src/features/translation-jobs/api/useTranslationJobItems.test.ts`:

**Test Scenarios:**

1. **Successful fetch with items:**
   - Mock Supabase response with multiple items
   - Verify correct query parameters
   - Verify embedded keys data

2. **Successful fetch with empty result (new job):**
   - Mock empty items array
   - Mock successful job existence check
   - Verify returns empty array

3. **Invalid job ID format:**
   - Pass invalid UUID
   - Verify validation error thrown
   - Verify no Supabase call made

4. **Job not found:**
   - Mock empty items array
   - Mock job existence check returning null
   - Verify 404 error thrown

5. **Access denied (RLS):**
   - Mock empty items array from RLS filtering
   - Mock job existence check returning null (RLS applies here too)
   - Verify 404 error thrown (not 403)

6. **Database error:**
   - Mock Supabase error
   - Verify error handling and logging
   - Verify generic error message returned

7. **Sort order variations:**
   - Test different order parameters
   - Verify correct order applied to query

**Example Test:**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTranslationJobItems } from './useTranslationJobItems';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TranslationJobItemResponse } from '@/shared/types';

describe('useTranslationJobItems', () => {
  it('should fetch job items successfully', async () => {
    const mockItems: TranslationJobItemResponse[] = [
      {
        id: 'item-1',
        job_id: 'job-123',
        key_id: 'key-1',
        status: 'completed',
        error_code: null,
        error_message: null,
        created_at: '2025-01-15T10:15:00Z',
        updated_at: '2025-01-15T10:16:00Z',
        keys: {
          full_key: 'app.home.title',
        },
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockItems,
              error: null,
            }),
          }),
        }),
      }),
    };

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useTranslationJobItems({ jobId: 'job-123' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockItems);
  });

  it('should throw validation error for invalid job ID', async () => {
    const { result } = renderHook(() => useTranslationJobItems({ jobId: 'invalid-uuid' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({
      error: {
        code: 'validation_error',
        message: expect.stringContaining('Invalid job ID format'),
      },
    });
  });
});
```

### Step 5: Create Job Items Component

Create `src/features/translation-jobs/components/TranslationJobItemsList.tsx`:

```typescript
import { useTranslationJobItems } from '../api';
import type { TranslationJobItemResponse } from '@/shared/types';

interface TranslationJobItemsListProps {
  jobId: string;
}

export function TranslationJobItemsList({ jobId }: TranslationJobItemsListProps) {
  const { data: items, isLoading, isError, error, refetch } = useTranslationJobItems({ jobId });

  if (isLoading) {
    return <div>Loading job items...</div>;
  }

  if (isError) {
    return (
      <div>
        <p>Error: {error.error.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <div>No items found for this job.</div>;
  }

  return (
    <div>
      <h3>Translation Job Items ({items.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Status</th>
            <th>Error</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.keys.full_key}</td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td>
                {item.error_code && (
                  <div>
                    <strong>{item.error_code}</strong>
                    <p>{item.error_message}</p>
                  </div>
                )}
              </td>
              <td>{new Date(item.updated_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'completed' | 'failed' }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return <span className={`px-2 py-1 rounded ${colors[status]}`}>{status}</span>;
}
```

### Step 6: Integrate into Job Detail Page

Update `src/features/translation-jobs/routes/TranslationJobDetailPage.tsx`:

```typescript
import { useParams } from 'react-router-dom';
import { useTranslationJob } from '../api/useTranslationJob';
import { TranslationJobItemsList } from '../components/TranslationJobItemsList';

export function TranslationJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: job, isLoading, isError } = useTranslationJob(jobId!);

  if (isLoading) return <div>Loading job...</div>;
  if (isError) return <div>Job not found</div>;

  return (
    <div>
      <h1>Translation Job: {job.id}</h1>
      <div>
        <p>Status: {job.status}</p>
        <p>Target Locale: {job.target_locale}</p>
        <p>Mode: {job.mode}</p>
      </div>

      <TranslationJobItemsList jobId={jobId!} />
    </div>
  );
}
```

### Step 7: Add Polling for Active Jobs (Optional)

Enhance `useTranslationJobItems` to poll for active jobs:

```typescript
export function useTranslationJobItems({ jobId, order = 'created_at.asc' }: UseTranslationJobItemsParams) {
  const supabase = useSupabase();
  const { data: job } = useTranslationJob(jobId); // Get job status

  const isActiveJob = job?.status === 'pending' || job?.status === 'running';

  return useQuery<TranslationJobItemResponse[], ApiError>({
    queryKey: translationJobItemsKeys.list(jobId),
    queryFn: async () => {
      // ... existing implementation
    },
    staleTime: isActiveJob ? 3 * 1000 : 10 * 60 * 1000, // 3 seconds for active, 10 minutes for finished
    refetchInterval: isActiveJob ? 5 * 1000 : false, // Poll every 5 seconds for active jobs
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

### Step 8: Add Component Tests

Create `src/features/translation-jobs/components/TranslationJobItemsList.test.tsx`:

**Test Scenarios:**

1. **Displays loading state**
2. **Displays items successfully**
3. **Displays error state with retry button**
4. **Displays empty state**
5. **Shows correct status badges**
6. **Shows error details for failed items**
7. **Retry button refetches data**

### Step 9: Add Real-Time Subscriptions (Future Enhancement)

Create `src/features/translation-jobs/hooks/useTranslationJobItemsRealtime.ts`:

```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { translationJobItemsKeys } from '../api/useTranslationJobItems';

export function useTranslationJobItemsRealtime(jobId: string, enabled: boolean = true) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const subscription = supabase
      .channel(`job_items_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translation_job_items',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          console.log('[Real-time] Job item updated:', payload);
          // Invalidate cache to trigger refetch
          queryClient.invalidateQueries({ queryKey: translationJobItemsKeys.list(jobId) });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [jobId, enabled, supabase, queryClient]);
}
```

### Step 10: Documentation

Create `src/features/translation-jobs/README.md` section for job items:

```markdown
## Translation Job Items

### Overview

Job items represent individual translation tasks within a translation job. Each item corresponds to one key being translated.

### API Hooks

#### `useTranslationJobItems`

Fetches all items for a specific translation job.

**Parameters:**

- `jobId` (string, required) - Translation job UUID
- `order` (string, optional) - Sort order (default: `'created_at.asc'`)

**Returns:** TanStack Query result with `TranslationJobItemResponse[]`

**Example:**

\`\`\`typescript
const { data: items, isLoading } = useTranslationJobItems({ jobId: 'job-123' });
\`\`\`

### Components

#### `TranslationJobItemsList`

Displays a table of job items with status indicators and error details.

**Props:**

- `jobId` (string, required) - Translation job UUID

**Example:**

\`\`\`typescript
<TranslationJobItemsList jobId="job-123" />
\`\`\`
```

### Step 11: Performance Testing

1. **Test with varying item counts:**
   - 10 items: ~1 KB response
   - 100 items: ~10 KB response
   - 1000 items: ~100 KB response

2. **Measure query execution time:**
   - Use browser DevTools Network tab
   - Verify < 100ms for typical jobs
   - Consider pagination if > 500 items

3. **Test polling impact:**
   - Monitor network traffic with active jobs
   - Verify 5-second intervals
   - Ensure polling stops when job completes

### Step 12: Accessibility Review

1. **Table accessibility:**
   - Ensure proper `<th>` and `<td>` structure
   - Add ARIA labels for status badges
   - Implement keyboard navigation

2. **Error messages:**
   - Use `role="alert"` for error displays
   - Ensure screen reader announces errors

3. **Status indicators:**
   - Don't rely on color alone
   - Add text labels to status badges
   - Use icons with alt text

### Step 13: Final Review and Deployment

1. Run `npm run lint` and fix any issues
2. Run `npm run test` and ensure all tests pass
3. Test manually with real translation jobs
4. Verify RLS policies work correctly
5. Update this implementation plan with any changes
6. Create pull request with comprehensive description
7. Request code review
8. Merge and deploy to staging
9. Monitor error tracking for issues
