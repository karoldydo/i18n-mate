# API Endpoint Implementation Plan: Projects

## 1. Endpoint Overview

The Projects API provides full CRUD operations for managing translation projects. Each project is owned by a user and serves as a container for translation keys, locales, and translation jobs. The API consists of five endpoints that handle listing, retrieval, creation, updating, and deletion of projects with proper authentication, authorization via RLS policies, and comprehensive validation.

### Key Features

- Paginated project listing with optional aggregated counts
- Single project retrieval with ownership validation
- Atomic project creation with automatic default locale setup via RPC
- Selective updates with immutability constraints on prefix and default_locale
- Cascading deletion of all related data
- **Centralized constants and validation patterns** for consistency between TypeScript and PostgreSQL constraints

### Endpoints Summary

1. **List Projects** - `GET /rest/v1/projects`
2. **Get Project Details** - `GET /rest/v1/projects?id=eq.{project_id}`
3. **Create Project** - `POST /rest/v1/rpc/create_project_with_default_locale`
4. **Update Project** - `PATCH /rest/v1/projects?id=eq.{project_id}`
5. **Delete Project** - `DELETE /rest/v1/projects?id=eq.{project_id}`

## 2. Request Details

### 2.1 List Projects

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/projects` or `/rest/v1/rpc/list_projects_with_counts`
- **Authentication:** Required (JWT via Authorization header)
- **Parameters:**
  - Optional:
    - `select` (string) - Columns to return (default: `id,name,description,prefix,default_locale,created_at,updated_at`)
    - `limit` (number) - Items per page (default: 50, max: 100)
    - `offset` (number) - Pagination offset (default: 0)
    - `order` (string) - Sort order (default: `name.asc`, options: `name.asc`, `name.desc`, `created_at.asc`, `created_at.desc`)
- **Request Body:** None

**Example Request:**

```http
GET /rest/v1/rpc/list_projects_with_counts?limit=50&offset=0
Authorization: Bearer {access_token}
```

### 2.2 Get Project Details

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/projects?id=eq.{project_id}&select=*`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `id` (UUID) - Project ID (via query filter)
  - Optional:
    - `select` (string) - Columns to return (default: `*`)
- **Request Body:** None

**Example Request:**

```http
GET /rest/v1/projects?id=eq.550e8400-e29b-41d4-a716-446655440000&select=*
Authorization: Bearer {access_token}
```

### 2.3 Create Project

- **HTTP Method:** POST
- **URL Structure:** `/rest/v1/rpc/create_project_with_default_locale`
- **Authentication:** Required
- **Parameters:** None
- **Request Body:**

```json
{
  "p_default_locale": "en",
  "p_default_locale_label": "English",
  "p_description": "Main application translations",
  "p_name": "My App",
  "p_prefix": "app"
}
```

**Field Validation:**

- `p_name` (required, CITEXT) - Project name, unique per owner
- `p_prefix` (required, string) - 2-4 characters, `[a-z0-9._-]`, no trailing dot, unique per owner
- `p_default_locale` (required, string) - BCP-47 locale code (ll or ll-CC)
- `p_default_locale_label` (required, string) - Human-readable label for default locale (max 64 characters)
- `p_description` (optional, string) - Project description

### 2.4 Update Project

- **HTTP Method:** PATCH
- **URL Structure:** `/rest/v1/projects?id=eq.{project_id}`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `id` (UUID) - Project ID (via query filter)
- **Request Body:**

```json
{
  "description": "Updated description",
  "name": "Updated App Name"
}
```

**Field Validation:**

- `name` (optional, CITEXT) - New project name, must be unique per owner
- `description` (optional, string) - New description
- `prefix` and `default_locale` are **immutable** and will trigger 400 error if included

### 2.5 Delete Project

- **HTTP Method:** DELETE
- **URL Structure:** `/rest/v1/projects?id=eq.{project_id}`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `id` (UUID) - Project ID (via query filter)
- **Request Body:** None

## 3. Used Types

### 3.1 Existing Types (from `src/shared/types/types.ts`)

```typescript
// Response DTOs
export type ProjectResponse = Pick<
  Project,
  'created_at' | 'default_locale' | 'description' | 'id' | 'name' | 'prefix' | 'updated_at'
>;

export type ProjectWithCounts = ProjectResponse & {
  key_count: number;
  locale_count: number;
};

// Request DTOs
export interface CreateProjectWithDefaultLocaleRequest {
  default_locale: string;
  default_locale_label: string;
  description?: null | string;
  name: string;
  prefix: string;
}

export type CreateProjectRpcArgs = Database['public']['Functions']['create_project_with_default_locale']['Args'];

export type UpdateProjectRequest = Pick<ProjectUpdate, 'description' | 'name'>;

export interface ListProjectsParams extends PaginationParams {
  order?: 'created_at.asc' | 'created_at.desc' | 'name.asc' | 'name.desc';
}

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

Create validation schemas in `src/features/projects/api/projects.schemas.ts`:

**Note:** The implementation now uses constants from `src/shared/constants/projects.constants.ts` for validation parameters, error messages, and patterns. This ensures consistency between client-side validation and database constraints.

```typescript
import { z } from 'zod';

import {
  PROJECT_LOCALE_LABEL_MAX_LENGTH,
  PROJECT_LOCALE_LABEL_MIN_LENGTH,
  PROJECT_PREFIX_MAX_LENGTH,
  PROJECT_PREFIX_MIN_LENGTH,
  PROJECT_PREFIX_PATTERN,
  PROJECT_SORT_OPTIONS,
  PROJECTS_DEFAULT_LIMIT,
  PROJECTS_ERROR_MESSAGES,
  PROJECTS_MAX_LIMIT,
  PROJECTS_MIN_OFFSET,
} from '@/shared/constants';
import type {
  CreateProjectRpcArgs,
  CreateProjectWithDefaultLocaleRequest,
  ListProjectsParams,
  ProjectResponse,
  ProjectWithCounts,
  UpdateProjectRequest,
} from '@/shared/types';

// locale code validation (bcp-47 format)
const LOCALE_CODE_SCHEMA = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// prefix validation
const PREFIX_SCHEMA = z
  .string()
  .min(PROJECT_PREFIX_MIN_LENGTH, PROJECTS_ERROR_MESSAGES.PREFIX_TOO_SHORT)
  .max(PROJECT_PREFIX_MAX_LENGTH, PROJECTS_ERROR_MESSAGES.PREFIX_TOO_LONG)
  .regex(PROJECT_PREFIX_PATTERN, PROJECTS_ERROR_MESSAGES.PREFIX_INVALID_FORMAT)
  .refine((val) => !val.endsWith('.'), PROJECTS_ERROR_MESSAGES.PREFIX_TRAILING_DOT);

// list projects schema
export const LIST_PROJECTS_SCHEMA = z
  .object({
    limit: z.number().int().min(1).max(PROJECTS_MAX_LIMIT).optional().default(PROJECTS_DEFAULT_LIMIT),
    offset: z.number().int().min(PROJECTS_MIN_OFFSET).optional().default(PROJECTS_MIN_OFFSET),
    order: z
      .enum([
        PROJECT_SORT_OPTIONS.NAME_ASC,
        PROJECT_SORT_OPTIONS.NAME_DESC,
        PROJECT_SORT_OPTIONS.CREATED_AT_ASC,
        PROJECT_SORT_OPTIONS.CREATED_AT_DESC,
      ])
      .optional()
      .default(PROJECT_SORT_OPTIONS.NAME_ASC),
  })
  satisfies z.ZodType<ListProjectsParams>;

// Create Project Request Schema (API input format without p_ prefix)
export const CREATE_PROJECT_REQUEST_SCHEMA = z
  .object({
    default_locale: LOCALE_CODE_SCHEMA,
    default_locale_label: z
      .string()
      .min(1, 'Default locale label is required')
      .max(64, 'Default locale label must be at most 64 characters')
      .trim(),
    description: z.string().trim().optional().nullable(),
    name: z.string().min(1, 'Project name is required').trim(),
    prefix: PREFIX_SCHEMA,
  })
  satisfies z.ZodType<CreateProjectWithDefaultLocaleRequest>;

// Create Project Schema with RPC parameter transformation (adds p_ prefix)
// This schema automatically converts API request format to Supabase RPC parameter format
export const CREATE_PROJECT_SCHEMA = CREATE_PROJECT_REQUEST_SCHEMA.transform(
  (data): CreateProjectRpcArgs => ({
    p_default_locale: data.default_locale,
    p_default_locale_label: data.default_locale_label,
    p_description: data.description ?? undefined,
    p_name: data.name,
    p_prefix: data.prefix,
  })
) satisfies z.ZodType<CreateProjectRpcArgs>;

// Update Project Schema
export const UPDATE_PROJECT_SCHEMA = z
  .object({
    default_locale: z.never().optional(),
    description: z.string().trim().optional().nullable(),
    name: z.string().min(1, 'Project name cannot be empty').trim().optional(),
    // prevent immutable fields
    prefix: z.never().optional(),
  })
  .strict() satisfies z.ZodType<UpdateProjectRequest>;

// UUID schema
export const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

// Response Schemas for runtime validation
export const PROJECT_RESPONSE_SCHEMA = z
  .object({
    created_at: z.string(),
    default_locale: z.string(),
    description: z.string().nullable(),
    id: z.string().uuid(),
    name: z.string(),
    prefix: z.string(),
    updated_at: z.string(),
  })
  satisfies z.ZodType<ProjectResponse>;

export const PROJECT_WITH_COUNTS_SCHEMA = PROJECT_RESPONSE_SCHEMA.extend({
  key_count: z.number(),
  locale_count: z.number(),
}) satisfies z.ZodType<ProjectWithCounts>;
```

## 4. Response Details

### 4.1 List Projects

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "created_at": "2025-01-15T10:00:00Z",
      "default_locale": "en",
      "description": "Main application translations",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "key_count": 120,
      "locale_count": 5,
      "name": "My App",
      "prefix": "app",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ],
  "metadata": {
    "end": 0,
    "start": 0,
    "total": 120
  }
}
```

Note: The `metadata.total` value is populated when the client enables counting in the request (e.g., `{ count: 'exact' }` in the Supabase client options). Without this option, `total` may be 0.

### 4.2 Get Project Details

**Success Response (200 OK):**

There are two response shapes depending on how the request is made:

- REST (default, without singular headers): returns an array with a single item (PostgREST convention)
- Supabase client with `.single()`/`.maybeSingle()` or REST with singular Accept header: returns a single object

Array (default REST):

```json
[
  {
    "created_at": "2025-01-15T10:00:00Z",
    "default_locale": "en",
    "description": "Main application translations",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My App",
    "prefix": "app",
    "updated_at": "2025-01-15T10:00:00Z"
  }
]
```

Single object (Supabase client `.maybeSingle()` / REST with `Accept: application/vnd.pgrst.object+json`):

```json
{
  "created_at": "2025-01-15T10:00:00Z",
  "default_locale": "en",
  "description": "Main application translations",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My App",
  "prefix": "app",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**Note:** `owner_user_id` is excluded from all API responses since RLS policies ensure users can only access their own projects.

### 4.3 Create Project

**Success Response (201 Created):**

```json
{
  "created_at": "2025-01-15T10:00:00Z",
  "default_locale": "en",
  "description": "Main application translations",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My App",
  "prefix": "app",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

Note: This endpoint (and the corresponding `useCreateProject` hook) returns a single object representation of the project. Only list endpoints return a wrapper object with `{ data, metadata }`.

**Note:** `owner_user_id` is excluded from all API responses since RLS policies ensure users can only access their own projects.

### 4.4 Update Project

**Success Response (200 OK):**

```json
{
  "created_at": "2025-01-15T10:00:00Z",
  "default_locale": "en",
  "description": "Updated description",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated App Name",
  "prefix": "app",
  "updated_at": "2025-01-15T11:00:00Z"
}
```

Note: This endpoint (and the corresponding `useUpdateProject` hook) returns a single object representation of the project. Only list endpoints return a wrapper object with `{ data, metadata }`.

**Note:** `owner_user_id` is excluded from all API responses since RLS policies ensure users can only access their own projects.

### 4.5 Delete Project

**Success Response (204 No Content)**

Empty response body.

### 4.6 Error Responses

All error responses follow the structure: `{ data: null, error: { code, message, details? } }`

**400 Bad Request (Validation Error):**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "details": {
      "constraint": "min_length",
      "field": "prefix"
    },
    "message": "Prefix must be at least 2 characters"
  }
}
```

**409 Conflict:**

```json
{
  "data": null,
  "error": {
    "code": 409,
    "message": "Project with this name already exists"
  }
}
```

**404 Not Found:**

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

### 5.1 List Projects Flow

1. User requests project list via React component
2. TanStack Query hook (`useProjects`) is invoked with pagination params
3. Hook validates params using Zod schema
4. Hook retrieves Supabase client from `useSupabase()` context
5. Client calls RPC function `list_projects_with_counts` with validated params
6. RLS policy filters results by `owner_user_id = auth.uid()`
7. PostgreSQL executes aggregated query with LEFT JOINs to count locales and keys
8. Results are returned with `count` from Supabase
9. Hook constructs `ProjectListResponse` with data array and pagination metadata
10. TanStack Query caches results including metadata
11. Component renders project list with counts and pagination controls

### 5.2 Get Project Details Flow

1. User navigates to project detail page with project ID in URL
2. React Router loader or component invokes `useProject` hook with project ID
3. Hook validates UUID format using Zod
4. Hook calls Supabase client with `.eq('id', projectId).maybeSingle()`
5. RLS policy validates `owner_user_id = auth.uid()`
6. If unauthorized or not found, Supabase returns null → hook throws 404 error
7. If found, project data is cached by TanStack Query
8. Component renders project details

### 5.3 Create Project Flow

1. User submits project creation form
2. `useCreateProject` mutation hook receives form data
3. Hook validates data using `createProjectSchema`
4. If validation fails, return 400 error immediately
5. Hook calls Supabase RPC `create_project_with_default_locale` with validated data
6. RPC function atomically:
   - Inserts new project row with `owner_user_id = auth.uid()`
   - Inserts default locale into `project_locales` table
   - Emits `project_created` telemetry event
7. Database enforces unique constraints on (owner_user_id, name) and (owner_user_id, prefix)
8. On conflict, PostgreSQL returns unique violation error → hook returns 409
9. On success, RPC returns new project data
10. TanStack Query invalidates project list cache
11. Component navigates to new project details page

### 5.4 Update Project Flow

1. User submits project update form
2. `useUpdateProject` mutation hook receives project ID and update data
3. Hook validates data using `updateProjectSchema` (ensures no immutable fields)
4. Hook validates project ID using UUID schema
5. Hook calls Supabase `.update()` with validated data and `.eq('id', projectId)`
6. Database triggers `prevent_project_prefix_update_trigger` and `prevent_project_default_locale_update_trigger` check for immutability violations
7. If user attempts to change immutable fields, trigger raises exception → hook returns 400
8. RLS policy validates ownership
9. If unauthorized or not found, Supabase returns empty result → hook returns 404
10. Unique constraint on name is checked → potential 409 conflict
11. On success, updated project data is returned
12. TanStack Query updates cache and invalidates related queries
13. Component displays success message

### 5.5 Delete Project Flow

1. User confirms project deletion
2. `useDeleteProject` mutation hook receives project ID
3. Hook validates UUID format
4. Hook calls Supabase `.delete().eq('id', projectId)`
5. RLS policy validates ownership
6. If unauthorized or not found, returns 404
7. PostgreSQL CASCADE DELETE removes all related data:
   - `project_locales` rows
   - `keys` rows
   - `translations` rows
   - `translation_jobs` rows
   - `translation_job_items` rows
   - `telemetry_events` rows
8. On success, Supabase returns 204 No Content
9. TanStack Query invalidates all project-related caches
10. Component navigates to project list page

## 6. Security Considerations

### 6.1 Authentication

- All endpoints require valid JWT access token in `Authorization: Bearer {token}` header
- Token is obtained via Supabase Auth during sign-in
- Token is stored in Supabase client session and automatically included in requests
- Token expiration is handled by Supabase client with automatic refresh

### 6.2 Authorization

- Row-Level Security (RLS) policies enforce `owner_user_id = auth.uid()` on all operations
- Users can only access their own projects
- RLS policies are defined in `supabase/migrations/20251013143400_create_rls_policies.sql`
- Policy names:
  - `projects_select_policy` - SELECT where owner_user_id = auth.uid()
  - `projects_insert_policy` - INSERT with owner_user_id = auth.uid()
  - `projects_update_policy` - UPDATE where owner_user_id = auth.uid()
  - `projects_delete_policy` - DELETE where owner_user_id = auth.uid()
- Trigger names:
  - `prevent_project_prefix_update_trigger` - Prevents modification of prefix field
  - `prevent_project_default_locale_update_trigger` - Prevents modification of default_locale field

### 6.3 Input Validation

- **Client-side validation:** Zod schemas validate all input before sending to backend
- **Database-level validation:** CHECK constraints and triggers enforce data integrity
- **Immutability enforcement:** Database triggers (`prevent_project_prefix_update_trigger`, `prevent_project_default_locale_update_trigger`) prevent changes to `prefix` and `default_locale`
- **Unique constraints:** Database enforces uniqueness of (owner_user_id, name) and (owner_user_id, prefix)

### 6.4 SQL Injection Prevention

- Supabase client uses parameterized queries for all operations
- Never construct raw SQL strings from user input
- RPC functions use typed parameters

### 6.5 Data Exposure

- `owner_user_id` is automatically set by RLS and should not be exposed in any API responses
- All API responses exclude `owner_user_id` since RLS policies ensure users can only access their own projects
- Sensitive fields are excluded from default SELECT statements

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Empty or invalid project name
- Prefix < 2 or > 4 characters
- Prefix contains invalid characters or ends with dot
- Invalid locale code format (not BCP-47)
- Attempt to update immutable fields (prefix, default_locale)
- Invalid pagination parameters (limit > 100, negative offset)

**Handling:**

Zod validation errors are automatically converted to ApiErrorResponse format by a global QueryClient error handler configured in `src/app/config/queryClient/queryClient.ts`. This ensures consistent error format across all queries and mutations without requiring try/catch blocks in individual hooks.

**Global QueryClient Configuration:**

The QueryClient is configured with global error handling in `src/app/config/queryClient/queryClient.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '@/shared/types';
import { createApiErrorResponse } from '@/shared/utils';

/**
 * Handle Zod validation errors and convert them to API errors
 */
function handleValidationError(error: ZodError, context?: string): ApiErrorResponse {
  const logPrefix = context ? `[${context}]` : '[handleValidationError]';
  console.error(`${logPrefix} Validation error:`, error);

  const firstError = error.errors[0];

  return createApiErrorResponse(400, firstError.message, {
    constraint: firstError.code,
    field: firstError.path.join('.'),
  });
}

/**
 * Check if an error is a Zod validation error
 */
function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

/**
 * Global QueryClient configuration with automatic Zod error handling
 */
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error) => {
        // Transform Zod validation errors to ApiError format
        if (isZodError(error)) {
          const apiError = handleValidationError(error);
          // Re-throw as ApiError to maintain error chain
          throw apiError;
        }
      },
    },
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on validation errors
        if (isZodError(error)) {
          return false;
        }
        // Default retry logic for other errors (max 3 attempts)
        return failureCount < 3;
      },
    },
  },
});

export { queryClient };
```

This configuration is then imported and used in `src/app/main.tsx`:

```typescript
import { queryClient } from '@/app/config/queryClient';
```

**Result Format:**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "details": {
      "constraint": "too_small",
      "field": "p_prefix"
    },
    "message": "Prefix must be at least 2 characters"
  }
}
```

**Benefits:**

- **DRY Principle:** No try/catch duplication in hooks
- **Consistency:** All validation errors use the same format
- **Automatic:** Works for all queries and mutations
- **Centralized:** Easy to extend with additional error types
- **Performance:** No retry attempts on validation errors

### 7.2 Authorization Errors (403/404)

**Trigger Conditions:**

- User attempts to access project owned by another user
- RLS policy denies access

**Handling:**

- Supabase returns empty result set for SELECT queries
- Return 404 "Project not found" to avoid leaking existence
- Do not distinguish between "doesn't exist" and "access denied"

### 7.3 Conflict Errors (409)

**Trigger Conditions:**

- Duplicate project name for same owner
- Duplicate prefix for same owner

**Handling:**

- Catch PostgreSQL unique constraint violation error code `23505`
- Parse error message to determine which field caused conflict
- Return user-friendly message: "Project with this name already exists" or "Prefix is already in use"

**Example:**

```typescript
const { data, error } = await supabase.rpc('create_project_with_default_locale', validatedData);

if (error) {
  throw createDatabaseErrorResponse(error, 'useCreateProject', 'Failed to create project');
}

// The createDatabaseErrorResponse function handles the error mapping:
// - 23505 with 'projects_name_unique_per_owner' -> 409 'Project with this name already exists'
// - 23505 with 'projects_prefix_unique_per_owner' -> 409 'Prefix is already in use'
```

### 7.4 Database Trigger Errors (400)

**Trigger Conditions:**

- Attempt to change `prefix` (prevented by `prevent_project_prefix_update_trigger`)
- Attempt to change `default_locale` (prevented by `prevent_project_default_locale_update_trigger`)

**Handling:**

- Catch PostgreSQL RAISE EXCEPTION from trigger
- Return 400 with specific message based on field:
  - For `prefix`: "Cannot modify prefix after creation" (trigger: `prevent_project_prefix_update_trigger`)
  - For `default_locale`: "Cannot modify default locale after creation" (trigger: `prevent_project_default_locale_update_trigger`)

### 7.5 Not Found Errors (404)

**Trigger Conditions:**

- Project ID doesn't exist
- RLS policy denies access (appears as not found)

**Handling:**

```typescript
import { createApiErrorResponse } from '@/shared/utils';

const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();

if (!data) {
  throw createApiErrorResponse(404, 'Project not found or access denied');
}
```

### 7.6 Server Errors (500)

**Trigger Conditions:**

- Database connection failure
- RPC function execution error
- Unexpected database constraint violation
- Cascade delete failure

**Handling:**

- Log full error details to console (development)
- Return generic message to user: "An unexpected error occurred. Please try again."
- Do not expose internal error details to client

**Example:**

```typescript
const { data, error } = await supabase.rpc('create_project_with_default_locale', validatedData);

if (error) {
  throw createDatabaseErrorResponse(error, 'useCreateProject', 'Failed to create project');
}

// The createDatabaseErrorResponse function logs the error and returns a structured ApiErrorResponse
// For unknown errors, it returns a 500 status with the fallback message
```

## 8. Performance Considerations

### 8.1 Query Optimization

**Indexing:**

- Primary key index on `id` (auto-created)
- Composite unique index on `(owner_user_id, name)` for fast duplicate checking
- Composite unique index on `(owner_user_id, prefix)` for fast duplicate checking
- Index on `owner_user_id` for efficient RLS filtering (defined in `supabase/migrations/20251013143200_create_indexes.sql`)

**Pagination:**

- Use `limit` and `offset` for cursor-based pagination
- Default limit of 50 balances UX and performance
- Max limit of 100 prevents excessive data transfer

**Selective Fetching:**

- Use `select` parameter to fetch only required columns
- List view excludes `owner_user_id` to reduce payload size
- Use `list_projects_with_counts` RPC for aggregated data instead of N+1 queries

### 8.2 Caching Strategy

**TanStack Query Configuration:**

```typescript
// List projects: 5-minute cache
staleTime: 5 * 60 * 1000,
gcTime: 10 * 60 * 1000,

// Single project: 10-minute cache
staleTime: 10 * 60 * 1000,
gcTime: 30 * 60 * 1000,
```

**Cache Invalidation:**

- Create project → invalidate list cache
- Update project → invalidate list cache and single project cache
- Delete project → invalidate list cache and remove from query cache

### 8.3 Optimistic Updates

**Update Project:**

```typescript
const updateMutation = useMutation({
  mutationFn: updateProject,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['projects', projectId] });

    // Snapshot previous value
    const previousProject = queryClient.getQueryData(['projects', projectId]);

    // Optimistically update
    queryClient.setQueryData(['projects', projectId], (old) => ({ ...old, ...newData }));

    return { previousProject };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['projects', projectId], context.previousProject);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
  },
});
```

### 8.4 Database Performance

**RPC Function Optimization:**

- `list_projects_with_counts` uses efficient LEFT JOINs with COUNT
- Indexes on foreign keys ensure fast joins

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

```bash
mkdir -p src/features/projects/{api}
```

### Step 2: Create Projects Constants

Create `src/shared/constants/projects.constants.ts` with centralized constants, patterns, and utilities:

```typescript
/**
 * Projects Constants and Validation Patterns
 *
 * Centralized definitions for project validation patterns to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL domain constraints.
 */

// Validation patterns
export const PROJECT_PREFIX_PATTERN = /^[a-z0-9._-]+$/;
export const TRAILING_DOT_PATTERN = /\.$/;

// Length constraints
export const PROJECT_PREFIX_MIN_LENGTH = 2;
export const PROJECT_PREFIX_MAX_LENGTH = 4;
export const PROJECT_NAME_MIN_LENGTH = 1;
export const PROJECT_NAME_MAX_LENGTH = 255;
export const PROJECT_LOCALE_LABEL_MAX_LENGTH = 64;

// Pagination defaults
export const PROJECTS_DEFAULT_LIMIT = 50;
export const PROJECTS_MAX_LIMIT = 100;
export const PROJECTS_MIN_OFFSET = 0;

// PostgreSQL error codes and constraints
export const PROJECTS_PG_ERROR_CODES = {
  CHECK_VIOLATION: '23514',
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
} as const;

export const PROJECTS_CONSTRAINTS = {
  NAME_UNIQUE_PER_OWNER: 'projects_name_unique_per_owner',
  PREFIX_UNIQUE_PER_OWNER: 'projects_prefix_unique_per_owner',
} as const;

// Sorting options
export const PROJECT_SORT_OPTIONS = {
  CREATED_AT_ASC: 'created_at.asc',
  CREATED_AT_DESC: 'created_at.desc',
  NAME_ASC: 'name.asc',
  NAME_DESC: 'name.desc',
} as const;

// Centralized error messages
export const PROJECTS_ERROR_MESSAGES = {
  // Validation errors
  NAME_REQUIRED: 'Project name is required',
  PREFIX_TOO_SHORT: `Prefix must be at least ${PROJECT_PREFIX_MIN_LENGTH} characters`,
  PREFIX_TOO_LONG: `Prefix must be at most ${PROJECT_PREFIX_MAX_LENGTH} characters`,
  PREFIX_INVALID_FORMAT: 'Prefix can only contain lowercase letters, numbers, dots, underscores, and hyphens',
  PREFIX_TRAILING_DOT: 'Prefix cannot end with a dot',
  LOCALE_LABEL_REQUIRED: 'Default locale label is required',
  LOCALE_LABEL_TOO_LONG: `Default locale label must be at most ${PROJECT_LOCALE_LABEL_MAX_LENGTH} characters`,

  // Database operation errors
  PROJECT_NAME_EXISTS: 'Project with this name already exists',
  PREFIX_ALREADY_IN_USE: 'Prefix is already in use',
  PREFIX_IMMUTABLE: 'Cannot modify prefix after creation',
  DEFAULT_LOCALE_IMMUTABLE: 'Cannot modify default locale after creation',
  PROJECT_NOT_FOUND: 'Project not found or access denied',

  // Generic errors
  DATABASE_ERROR: 'Database operation failed',
  NO_DATA_RETURNED: 'No data returned from server',
  INVALID_FIELD_VALUE: 'Invalid field value',
  REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource not found',
} as const;

// Validation utilities
export const PROJECT_VALIDATION = {
  isValidPrefixClient: (prefix: string): boolean => {
    if (!prefix || typeof prefix !== 'string') return false;
    if (prefix.length < PROJECT_PREFIX_MIN_LENGTH || prefix.length > PROJECT_PREFIX_MAX_LENGTH) return false;
    if (!PROJECT_PREFIX_PATTERN.test(prefix)) return false;
    if (TRAILING_DOT_PATTERN.test(prefix)) return false;
    return true;
  },
  // ... other validation utilities
};
```

Add to `src/shared/constants/index.ts`:

```typescript
export * from './keys.constants';
export * from './locale.constants';
export * from './projects.constants';
```

### Step 3: Create Zod Validation Schemas

Create `src/features/projects/api/projects.schemas.ts` with all validation schemas defined in section 3.2.

### Step 4: Create Error Handling Utilities

Create `src/features/projects/api/projects.errors.ts`:

**Note:** The implementation now uses constants from `src/shared/constants/projects.constants.ts` for error codes, constraint names, and error messages. This ensures consistency across the application.

```typescript
import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { createApiErrorResponse } from '@/shared/utils';
import { PROJECTS_PG_ERROR_CODES, PROJECTS_CONSTRAINTS, PROJECTS_ERROR_MESSAGES } from '@/shared/constants';

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors including:
 * - Unique constraint violations (23505)
 * - Check constraint violations (23514)
 * - Foreign key violations (23503)
 * - Trigger violations (immutable fields)
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

  // Handle unique constraint violations
  if (error.code === '23505') {
    if (error.message.includes('projects_name_unique_per_owner')) {
      return createApiErrorResponse(409, 'Project with this name already exists');
    }
    if (error.message.includes('projects_prefix_unique_per_owner')) {
      return createApiErrorResponse(409, 'Prefix is already in use');
    }
  }

  // Handle trigger violations (immutable fields)
  if (error.message.includes('prefix is immutable')) {
    return createApiErrorResponse(400, 'Cannot modify prefix after creation');
  }
  if (error.message.includes('default_locale is immutable')) {
    return createApiErrorResponse(400, 'Cannot modify default locale after creation');
  }

  // Handle check constraint violations
  if (error.code === '23514') {
    return createApiErrorResponse(400, 'Invalid field value', { constraint: error.details });
  }

  // Handle foreign key violations
  if (error.code === '23503') {
    return createApiErrorResponse(404, 'Referenced resource not found');
  }

  // Generic database error (generic errors should come last, after specific checks)
  return createApiErrorResponse(500, fallbackMessage || 'Database operation failed', { original: error });
}
```

This module provides centralized error handling utilities used by all TanStack Query hooks.

**Note:** The `createApiErrorResponse()` factory function is defined in `src/shared/utils/index.ts` as a shared utility for creating standardized API error responses across the entire application.

**Benefits:**

- DRY principle - no code duplication across hooks
- Consistent error format across all endpoints
- Single source of truth for error messages
- Easy to extend with new error types

### Step 5: Create Query Keys Factory

Create `src/features/projects/api/projects.key-factory.ts`:

```typescript
import type { ListProjectsParams } from '@/shared/types';

/**
 * Query key factory for projects
 * Follows TanStack Query best practices for structured query keys
 */
export const PROJECTS_KEY_FACTORY = {
  all: ['projects'] as const,
  detail: (id: string) => [...PROJECTS_KEY_FACTORY.details(), id] as const,
  details: () => [...PROJECTS_KEY_FACTORY.all, 'detail'] as const,
  list: (params: ListProjectsParams) => [...PROJECTS_KEY_FACTORY.lists(), params] as const,
  lists: () => [...PROJECTS_KEY_FACTORY.all, 'list'] as const,
};
```

**Note:** Properties are ordered alphabetically for consistency and easier code navigation.

### Step 6: Create TanStack Query Hooks

**Implementation Notes:**

- All hooks follow TanStack Query best practices with proper error handling
- Use optimistic updates for better UX in mutation hooks
- Implement proper cache invalidation strategies
- Include TypeScript generics for type safety and RPC parameter handling

**6.1 Create `src/features/projects/api/useProjects/useProjects.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { ApiErrorResponse, ListProjectsParams, ProjectListResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createDatabaseErrorResponse } from '../projects.errors';
import { PROJECTS_KEY_FACTORY } from '../projects.key-factory';
import { LIST_PROJECTS_SCHEMA, PROJECT_WITH_COUNTS_SCHEMA } from '../projects.schemas';

/**
 * Fetch a paginated list of projects with counts
 *
 * Uses the RPC function `list_projects_with_counts` with exact total counting
 * enabled. Returns projects with aggregated locale and key counts. Data items
 * are validated at runtime and pagination metadata is computed from input params.
 *
 * @param listProjectsParams - Optional listing parameters (limit, offset, order)
 * @param params.limit - Items per page (1-100, default: 50)
 * @param params.offset - Pagination offset (min: 0, default: 0)
 * @param params.order - Sort order (name.asc|desc, created_at.asc|desc, default: name.asc)
 * @throws {ApiErrorResponse} 400 - Validation error (limit > 100, negative offset)
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 * @returns TanStack Query result with projects data and pagination metadata
 */
export function useProjects(listProjectsParams: ListProjectsParams = {}) {
  const supabase = useSupabase();

  return useQuery<ProjectListResponse, ApiErrorResponse>({
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      const params = LIST_PROJECTS_SCHEMA.parse(listProjectsParams);
      const { count, data, error } = await supabase
        .rpc(
          'list_projects_with_counts',
          {
            p_limit: params.limit,
            p_offset: params.offset,
          },
          { count: 'exact' }
        )
        .order(params.order?.split('.')[0] || 'name', {
          ascending: params.order?.endsWith('.asc') ?? true,
        });

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProjects', 'Failed to fetch projects');
      }

      // runtime validation of response data
      const projects = z.array(PROJECT_WITH_COUNTS_SCHEMA).parse(data || []);

      return {
        data: projects,
        metadata: {
          end: (params.offset || 0) + projects.length - 1,
          start: params.offset || 0,
          total: count || 0,
        },
      };
    },
    queryKey: PROJECTS_KEY_FACTORY.list(listProjectsParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**6.2 Create `src/features/projects/api/useProject/useProject.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import type { ApiErrorResponse, ProjectResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';
import { createDatabaseErrorResponse } from '../projects.errors';
import { PROJECTS_KEY_FACTORY } from '../projects.key-factory';
import { PROJECT_RESPONSE_SCHEMA, UUID_SCHEMA } from '../projects.schemas';

/**
 * Fetch a single project by ID
 *
 * Queries the `projects` table for the given ID with RLS-based access control
 * and validates the response against the runtime schema. Returns 404-style error
 * if the project is not found or the user has no access.
 *
 * @param projectId - UUID of the project to fetch
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid UUID format)
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns TanStack Query result with the project data
 */
export function useProject(projectId: string) {
  const supabase = useSupabase();

  return useQuery<ProjectResponse, ApiErrorResponse>({
    gcTime: 30 * 60 * 1000, // 30 minutes
    queryFn: async () => {
      const id = UUID_SCHEMA.parse(projectId);

      const { data, error } = await supabase
        .from('projects')
        .select('id,name,description,prefix,default_locale,created_at,updated_at')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProject', 'Failed to fetch project');
      }

      if (!data) {
        throw createApiErrorResponse(404, PROJECTS_ERROR_MESSAGES.PROJECT_NOT_FOUND);
      }

      return PROJECT_RESPONSE_SCHEMA.parse(data);
    },
    queryKey: PROJECTS_KEY_FACTORY.detail(projectId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

**6.3 Create `src/features/projects/api/useCreateProject/useCreateProject.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiErrorResponse, CreateProjectWithDefaultLocaleRequest, ProjectResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';
import { createDatabaseErrorResponse } from '../projects.errors';
import { PROJECTS_KEY_FACTORY } from '../projects.key-factory';
import { CREATE_PROJECT_SCHEMA, PROJECT_RESPONSE_SCHEMA } from '../projects.schemas';

/**
 * Create a new project with a default locale
 *
 * Uses the RPC function `create_project_with_default_locale` to create a
 * project and its initial default locale in a single transaction. The
 * database enforces prefix validation and uniqueness and will normalize
 * provided values according to schema rules.
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid prefix format, length constraints)
 * @throws {ApiErrorResponse} 409 - Conflict error (duplicate name or prefix for user)
 * @throws {ApiErrorResponse} 500 - Database error or no data returned
 *
 * @returns TanStack Query mutation hook for creating projects
 */
export function useCreateProject() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectResponse, ApiErrorResponse, CreateProjectWithDefaultLocaleRequest>({
    mutationFn: async (payload) => {
      const body = CREATE_PROJECT_SCHEMA.parse(payload);

      const { data, error } = await supabase.rpc('create_project_with_default_locale', body).maybeSingle();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useCreateProject', 'Failed to create project');
      }

      if (!data) {
        throw createApiErrorResponse(500, PROJECTS_ERROR_MESSAGES.NO_DATA_RETURNED);
      }

      return PROJECT_RESPONSE_SCHEMA.parse(data);
    },
    onSuccess: () => {
      // invalidate project list cache
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY_FACTORY.lists() });
    },
  });
}
```

**6.4 Create `src/features/projects/api/useUpdateProject/useUpdateProject.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiErrorResponse, ProjectResponse, UpdateProjectRequest } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';
import { createDatabaseErrorResponse } from '../projects.errors';
import { PROJECTS_KEY_FACTORY } from '../projects.key-factory';
import { PROJECT_RESPONSE_SCHEMA, UPDATE_PROJECT_SCHEMA, UUID_SCHEMA } from '../projects.schemas';

/**
 * Context type for mutation callbacks
 */
interface UpdateProjectContext {
  previousProject?: ProjectResponse;
}

/**
 * Update a project's fields with optimistic UI
 *
 * Updates mutable project fields (name, description only). Applies optimistic
 * updates to the project detail cache with automatic rollback on error and
 * revalidation on settle. Immutable fields (prefix, default_locale) are blocked.
 *
 * @param projectId - UUID of the project to update
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid UUID, attempt to change immutable fields)
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 409 - Conflict error (duplicate name for user)
 * @throws {ApiErrorResponse} 500 - Database error
 *
 * @returns TanStack Query mutation hook for updating projects
 */
export function useUpdateProject(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectResponse, ApiErrorResponse, UpdateProjectRequest, UpdateProjectContext>({
    mutationFn: async (payload) => {
      const id = UUID_SCHEMA.parse(projectId);
      const body = UPDATE_PROJECT_SCHEMA.parse(payload);

      const { data, error } = await supabase
        .from('projects')
        .update(body)
        .eq('id', id)
        .select('id,name,description,prefix,default_locale,created_at,updated_at')
        .maybeSingle();

      // handle database errors
      if (error) {
        throw createDatabaseErrorResponse(error, 'useUpdateProject', 'Failed to update project');
      }

      // handle missing data (project not found or access denied)
      if (!data) {
        throw createApiErrorResponse(404, PROJECTS_ERROR_MESSAGES.PROJECT_NOT_FOUND);
      }

      // runtime validation of response data
      return PROJECT_RESPONSE_SCHEMA.parse(data);
    },
    onError: (_err, _newData, context) => {
      // rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(PROJECTS_KEY_FACTORY.detail(projectId), context.previousProject);
      }
    },
    onMutate: async (newData) => {
      // cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: PROJECTS_KEY_FACTORY.detail(projectId) });

      // snapshot previous value
      const previousProject = queryClient.getQueryData<ProjectResponse>(PROJECTS_KEY_FACTORY.detail(projectId));

      // optimistically update
      queryClient.setQueryData(PROJECTS_KEY_FACTORY.detail(projectId), (old: ProjectResponse | undefined) => {
        // guard clause: prevent errors if cache is empty
        if (!old) return old;
        return {
          ...old,
          ...newData,
        };
      });

      return { previousProject };
    },
    onSettled: () => {
      // refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY_FACTORY.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY_FACTORY.lists() });
    },
  });
}
```

**6.5 Create `src/features/projects/api/useDeleteProject/useDeleteProject.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiErrorResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { PROJECTS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';
import { createDatabaseErrorResponse } from '../projects.errors';
import { PROJECTS_KEY_FACTORY } from '../projects.key-factory';
import { UUID_SCHEMA } from '../projects.schemas';

/**
 * Delete a project by ID
 *
 * Removes the project record with cascading deletion of related data (locales,
 * keys, translations) handled by database constraints. Operation is irreversible.
 * On success, related caches are cleared and the project list is invalidated.
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid UUID format)
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during deletion
 * @returns TanStack Query mutation hook for deleting projects
 */
export function useDeleteProject() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiErrorResponse, string>({
    mutationFn: async (projectId) => {
      const id = UUID_SCHEMA.parse(projectId);

      const { count, error } = await supabase.from('projects').delete().eq('id', id);

      if (error) {
        throw createDatabaseErrorResponse(error, 'useDeleteProject', 'Failed to delete project');
      }

      if (count === 0) {
        throw createApiErrorResponse(404, PROJECTS_ERROR_MESSAGES.PROJECT_NOT_FOUND);
      }
    },
    onSuccess: (_, projectId) => {
      // remove from cache
      queryClient.removeQueries({ queryKey: PROJECTS_KEY_FACTORY.detail(projectId) });
      // invalidate list
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY_FACTORY.lists() });
    },
  });
}
```

### Step 7: Create API Index File

Create `src/features/projects/api/index.ts`:

```typescript
/**
 * Projects API
 *
 * This module provides TanStack Query hooks for managing translation projects.
 * All hooks use the shared Supabase client from context and follow React Query best practices.
 *
 * @module features/projects/api
 */

// Error Utilities
export { createDatabaseErrorResponse } from './projects.errors';
export { PROJECTS_KEY_FACTORY } from './projects.key-factory';
export * from './projects.schemas';
export * from './useCreateProject';
export * from './useDeleteProject';
export * from './useProject';
export * from './useProjects';
export * from './useUpdateProject';
```

**Organization:**

- Error utilities and key factory are exported explicitly for reuse
- Schemas and hooks are re-exported wholesale to simplify imports
- Hook directories expose `index.ts` files so the API barrel can use `export *` form
- Flat export list keeps tree-shaking effective while avoiding comment clutter

### Step 7.1: Expose Feature Barrel

Create `src/features/projects/index.ts` to provide a single entry point:

```typescript
export * from './api';
```

This keeps consumer imports concise (`import { useProjects } from '@/features/projects';`) while delegating module structure to the API index.

### Step 8: Write Unit Tests

**Testing Strategy:**

- Use Vitest with Testing Library for comprehensive test coverage
- Co-locate tests with source files (`Hook.test.ts` next to `Hook.ts`)
- Mock Supabase client using test utilities from `src/test/`
- Test both success and error scenarios with edge cases
- Verify cache behavior, pagination, and RPC functionality
- Aim for 90% coverage threshold as per project requirements

**8.1 Create `src/features/projects/api/useProjects/useProjects.test.ts`:**

Test scenarios:

- Successful list fetch with default params (verify metadata: start=0, end=0, total=1)
- Successful list fetch with custom pagination (verify metadata: start=20, end=20, total=50)
- Successful list fetch with sorting (asc/desc)
- Empty results (verify metadata: start=0, end=-1, total=0)
- Validation error for invalid params (limit > 100)
- Database error handling
- Pagination metadata for multiple items (verify end calculation: start + length - 1)
- Pagination metadata for last page (verify edge case handling)

**8.2 Create `src/features/projects/api/useProject/useProject.test.ts`:**

Test scenarios:

- Successful project fetch
- Invalid UUID format
- Project not found (404)
- RLS access denied (appears as 404)

**8.3 Create `src/features/projects/api/useCreateProject/useCreateProject.test.ts`:**

Test scenarios:

- Successful project creation
- Validation error (invalid prefix)
- Duplicate name conflict (409)
- Duplicate prefix conflict (409)
- Database error

**8.4 Create `src/features/projects/api/useUpdateProject/useUpdateProject.test.ts`:**

Test scenarios:

- Successful update (name only)
- Successful update (description only)
- Successful update (both fields)
- Optimistic update and rollback on error
- Attempt to change prefix (400)
- Attempt to change default_locale (400)
- Duplicate name conflict (409)
- Project not found (404)

**8.5 Create `src/features/projects/api/useDeleteProject/useDeleteProject.test.ts`:**

Test scenarios:

- Successful deletion
- Invalid UUID format
- Project not found (404)
- Verify cache invalidation
