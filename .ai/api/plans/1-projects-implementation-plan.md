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

### 3.1 Existing Types

**Import Path:** `@/shared/types` (central export) or `@/shared/types/projects` (feature-specific)

**Shared Types** (from `src/shared/types/types.ts`):

- `PaginationParams` - Query parameters for pagination
- `PaginationMetadata` - Response metadata with total count
- `ApiErrorResponse` - Generic error response wrapper
- `ValidationErrorResponse` - 400 validation error response
- `ConflictErrorResponse` - 409 conflict error response

**Projects Types** (from `src/shared/types/projects/index.ts`):

- `ProjectResponse`: canonical project payload (`id`, `name`, `description`, `prefix`, `default_locale`, `created_at`, `updated_at`) used across hooks.
- `ProjectWithCounts`: `ProjectResponse` plus `key_count` and `locale_count` aggregated via RPC list.
- `CreateProjectRequest`: input for creation with required `default_locale`, `default_locale_label`, `name`, `prefix`; `description` optional/null.
- `CreateProjectRpcArgs`: mapped RPC parameters for `create_project_with_default_locale`.
- `UpdateProjectRequest`: only `name` and `description` are mutable; `prefix` and `default_locale` are immutable by design.
- `UpdateProjectContext`: carries `previousProject` snapshot for optimistic update rollback.
- `ListProjectsParams`: pagination and sorting (`limit`, `offset`, order by `name`/`created_at` asc|desc).
- `PaginationMetadata`/`Response`: list response metadata (`start`, `end`, `total`) to power paging UI.
- `ApiErrorResponse` + specializations: standardized error envelope reused for 400/404/409/500 cases.

### 3.2 New Zod Validation Schemas

Create validation schemas in `src/features/projects/api/projects.schemas.ts`:

- `LOCALE_CODE_SCHEMA`: validates BCP‑47 format for `default_locale` (e.g., "en", "en-US").
- `PREFIX_SCHEMA`: enforces length bounds, character pattern, and no trailing dot using shared constants.
- `LIST_PROJECTS_SCHEMA`: constrains `limit`/`offset`, normalizes defaults, and restricts order to allowed values.
- `CREATE_PROJECT_REQUEST_SCHEMA`: trims strings and requires `name`, `prefix`, `default_locale`, and `default_locale_label`.
- `CREATE_PROJECT_SCHEMA`: transforms validated input into RPC parameter shape for `create_project_with_default_locale`.
- `UPDATE_PROJECT_SCHEMA`: strict object that allows only `name`/`description`; blocks `prefix` and `default_locale` changes.
- `UUID_SCHEMA`: ensures `projectId` is a valid UUID before DB access.
- `PROJECT_RESPONSE_SCHEMA`: runtime validation of the canonical project shape.
- `PROJECT_WITH_COUNTS_SCHEMA`: adds `key_count` and `locale_count` to list results.

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

### 4.2 Get Project Details

**Success Response (200 OK):**

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

- Global `QueryClient` maps `Zod` issues to standardized `ApiErrorResponse` (400) and disables retries for validation; other errors may retry up to three times.
- Configured in `src/app/config/queryClient/queryClient.ts` and applied via `QueryClientProvider` in `src/app/main.tsx`.

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

- Treat empty SELECT results as 404 to avoid leaking existence; present a unified "Project not found or access denied" message.

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

- List queries use `staleTime: 5 * 60 * 1000` and `gcTime: 10 * 60 * 1000` to balance freshness and memory.
- Detail queries use `staleTime: 10 * 60 * 1000` and `gcTime: 30 * 60 * 1000` for longer retention of individual items.

**Cache Invalidation:**

- Create project → invalidate list cache
- Update project → invalidate list cache and single project cache
- Delete project → invalidate list cache and remove from query cache

### 8.3 Optimistic Updates

- `useUpdateProject` applies optimistic cache updates for the project detail; on error, it rolls back using a `previousProject` snapshot.
- After settle, it revalidates both detail and list caches via `PROJECTS_KEY_FACTORY` to ensure server truth.

### 8.4 Database Performance

**RPC Function Optimization:**

- `list_projects_with_counts` uses efficient LEFT JOINs with COUNT
- Indexes on foreign keys ensure fast joins

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

- Create `src/features/projects/api` to host schemas, hooks, key factory, and error utilities.

### Step 2: Create Projects Constants

Create `src/shared/constants/projects.constants.ts` with patterns, numeric limits, sort options, and messages shared by schemas and DB constraints; re-export from `src/shared/constants/index.ts`.

### Step 3: Create Zod Validation Schemas

Create `src/features/projects/api/projects.schemas.ts` with all validation schemas defined in section 3.2.

### Step 4: Create Error Handling Utilities

Create `src/features/projects/api/projects.errors.ts`:

- Provide `createDatabaseErrorResponse` to normalize common Postgres errors: 23505 → 409 (name/prefix conflicts), 23514 → 400 (check violation), 23503 → 404 (missing reference), trigger messages → 400 (immutable fields).
- Include optional context for logging and a fallback message for unknown cases, returning a standardized ApiError envelope.

This module provides centralized error handling utilities used by all TanStack Query hooks.

**Note:** The `createApiErrorResponse()` factory function is defined in `src/shared/utils/index.ts` as a shared utility for creating standardized API error responses across the entire application.

### Step 5: Create Query Keys Factory

Create `src/features/projects/api/projects.key-factory.ts`:

- Expose structured keys: `all`, `lists`, `list(params)`, `details`, and `detail(id)` to standardize cache queries and invalidations.

### Step 6: Create TanStack Query Hooks

**Implementation Notes:**

- All hooks follow TanStack Query best practices with proper error handling and runtime validation.
- Use optimistic updates for better UX in mutation hooks; rollback on error and revalidate after settle.
- Implement cache invalidation for lists and detail views via `PROJECTS_KEY_FACTORY`.
- Include TypeScript generics for type safety and RPC parameter handling.

Planned hooks summary:

- useProjects: validate params, call RPC list with exact count, validate items, return data + pagination metadata; 5m stale/10m gc.
- useProject: validate UUID, fetch single row, map 404 when missing, validate payload; 10m stale/30m gc.
- useCreateProject: validate input, call RPC, map DB errors, ensure data present, validate response; invalidate lists on success.
- useUpdateProject: validate UUID and input, apply optimistic update with rollback; revalidate detail and lists on settle.
- useDeleteProject: validate UUID, delete by id, map 404 when nothing deleted; remove detail cache and invalidate lists.

### Step 7: Create API Index File

Create `src/features/projects/api/index.ts`:

- Barrel export error utilities, key factory, schemas, and hooks to simplify consumer imports and keep tree‑shaking effective.

**Organization:**

- Error utilities and key factory are exported explicitly for reuse
- Schemas and hooks are re-exported wholesale to simplify imports
- Hook directories expose `index.ts` files so the API barrel can use `export *` form
- Flat export list keeps tree-shaking effective while avoiding comment clutter

### Step 7.1: Expose Feature Barrel

Create `src/features/projects/index.ts` to provide a single entry point:

- Re-export the API barrel from the feature root to enable `import { useProjects } from '@/features/projects'`.

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
