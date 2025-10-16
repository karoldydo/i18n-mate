# API Endpoint Implementation Plan: Projects

## 1. Endpoint Overview

The Projects API provides full CRUD operations for managing translation projects. Each project is owned by a user and serves as a container for translation keys, locales, and translation jobs. The API consists of five endpoints that handle listing, retrieval, creation, updating, and deletion of projects with proper authentication, authorization via RLS policies, and comprehensive validation.

### Key Features

- Paginated project listing with optional aggregated counts
- Single project retrieval with ownership validation
- Atomic project creation with automatic default locale setup via RPC
- Selective updates with immutability constraints on prefix and default_locale
- Cascading deletion of all related data

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
- `p_default_locale_label` (required, string) - Human-readable label for default locale
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
export interface CreateProjectRequest {
  default_locale: string;
  description?: null | string;
  name: string;
  prefix: string;
}

export interface CreateProjectWithDefaultLocaleRequest extends CreateProjectRequest {
  default_locale_label: string;
}

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

```typescript
import { z } from 'zod';

// Locale code validation (BCP-47 format)
const localeCodeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// Prefix validation
const prefixSchema = z
  .string()
  .min(2, 'Prefix must be at least 2 characters')
  .max(4, 'Prefix must be at most 4 characters')
  .regex(/^[a-z0-9._-]+$/, 'Prefix can only contain lowercase letters, numbers, dots, underscores, and hyphens')
  .refine((val) => !val.endsWith('.'), 'Prefix cannot end with a dot');

// List Projects Schema
export const listProjectsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  order: z.enum(['name.asc', 'name.desc', 'created_at.asc', 'created_at.desc']).optional().default('name.asc'),
});

// Create Project Schema
export const createProjectSchema = z.object({
  p_name: z.string().min(1, 'Project name is required').trim(),
  p_prefix: prefixSchema,
  p_default_locale: localeCodeSchema,
  p_default_locale_label: z.string().min(1, 'Default locale label is required').trim(),
  p_description: z.string().trim().optional().nullable(),
});

// Update Project Schema
export const updateProjectSchema = z
  .object({
    name: z.string().min(1, 'Project name cannot be empty').trim().optional(),
    description: z.string().trim().optional().nullable(),
    // Prevent immutable fields
    prefix: z.never().optional(),
    default_locale: z.never().optional(),
  })
  .strict();

// Project ID Schema
export const projectIdSchema = z.string().uuid('Invalid project ID format');
```

## 4. Response Details

### 4.1 List Projects

**Success Response (200 OK):**

```json
[
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
]
```

**Headers:**

- `Content-Range: 0-49/120` - Pagination info (start-end/total)

### 4.2 Get Project Details

**Success Response (200 OK):**

Returns array with single project (Supabase convention):

```json
[
  {
    "created_at": "2025-01-15T10:00:00Z",
    "default_locale": "en",
    "description": "Main application translations",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My App",
    "owner_user_id": "user-uuid",
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
  "owner_user_id": "user-uuid",
  "prefix": "app",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

### 4.4 Update Project

**Success Response (200 OK):**

```json
{
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

**400 Bad Request (Validation Error):**

```json
{
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
  "error": {
    "code": 409,
    "message": "Project with this name already exists"
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": 404,
    "message": "Project not found or access denied"
  }
}
```

**500 Internal Server Error:**

```json
{
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
8. Results are returned with `Content-Range` header
9. TanStack Query caches results and provides pagination metadata
10. Component renders project list with counts

### 5.2 Get Project Details Flow

1. User navigates to project detail page with project ID in URL
2. React Router loader or component invokes `useProject` hook with project ID
3. Hook validates UUID format using Zod
4. Hook calls Supabase client with `.eq('id', projectId).single()`
5. RLS policy validates `owner_user_id = auth.uid()`
6. If unauthorized, Supabase returns empty result → hook returns 404 error
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
6. Database triggers `prevent_prefix_change_trigger` and `prevent_default_locale_change_trigger` check for immutability violations
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

### 6.3 Input Validation

- **Client-side validation:** Zod schemas validate all input before sending to backend
- **Database-level validation:** CHECK constraints and triggers enforce data integrity
- **Immutability enforcement:** Database triggers prevent changes to `prefix` and `default_locale`
- **Unique constraints:** Database enforces uniqueness of (owner_user_id, name) and (owner_user_id, prefix)

### 6.4 SQL Injection Prevention

- Supabase client uses parameterized queries for all operations
- Never construct raw SQL strings from user input
- RPC functions use typed parameters

### 6.5 Data Exposure

- `owner_user_id` is automatically set by RLS and should not be exposed in CREATE/UPDATE requests
- GET responses include `owner_user_id` only for project details, not for list view
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

```typescript
try {
  const validatedData = createProjectSchema.parse(formData);
} catch (error) {
  if (error instanceof z.ZodError) {
    return {
      error: {
        code: 400,
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
  if (error.code === '23505') {
    // Unique constraint violation
    if (error.message.includes('projects_name_unique_per_owner')) {
      return { error: { code: 409, message: 'Project with this name already exists' } };
    }
    if (error.message.includes('projects_prefix_unique_per_owner')) {
      return { error: { code: 409, message: 'Prefix is already in use' } };
    }
  }
}
```

### 7. Database Trigger Errors (400)

**Trigger Conditions:**

- Attempt to change `prefix` (prevented by `prevent_prefix_change_trigger`)
- Attempt to change `default_locale` (prevented by `prevent_default_locale_change_trigger`)

**Handling:**

- Catch PostgreSQL RAISE EXCEPTION from trigger
- Return 400 with message: "Cannot modify prefix after creation" or "Cannot modify default locale after creation"

### 7.5 Not Found Errors (404)

**Trigger Conditions:**

- Project ID doesn't exist
- RLS policy denies access (appears as not found)

**Handling:**

```typescript
const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();

if (!data) {
  return { error: { code: 404, message: 'Project not found or access denied' } };
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
  console.error('[useCreateProject] RPC error:', error);

  return {
    error: {
      code: 500,
      message: 'An unexpected error occurred. Please try again.',
    },
  };
}
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
mkdir -p src/features/projects/{api,components,routes,hooks}
```

### Step 2: Create Zod Validation Schemas

Create `src/features/projects/api/projects.schemas.ts` with all validation schemas defined in section 3.2.

### Step 3: Create Query Keys Factory

Create `src/features/projects/api/projects.keys.ts`:

```typescript
import type { ListProjectsParams } from '@/shared/types';

/**
 * Query key factory for projects
 * Follows TanStack Query best practices for structured query keys
 */
export const projectsKeys = {
  all: ['projects'] as const,
  lists: () => [...projectsKeys.all, 'list'] as const,
  list: (params: ListProjectsParams) => [...projectsKeys.lists(), params] as const,
  details: () => [...projectsKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectsKeys.details(), id] as const,
};
```

### Step 4: Create TanStack Query Hooks

**4.1 Create `src/features/projects/api/useProjects.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { listProjectsSchema } from './projects.schemas';
import { projectsKeys } from './projects.keys';
import type { ListProjectsParams, ProjectWithCounts, ApiError } from '@/shared/types';

export function useProjects(params: ListProjectsParams = {}) {
  const supabase = useSupabase();

  return useQuery<ProjectWithCounts[], ApiError>({
    queryKey: projectsKeys.list(params),
    queryFn: async () => {
      // Validate parameters
      const validated = listProjectsSchema.parse(params);

      // Call RPC function for list with counts
      const { data, error, count } = await supabase
        .rpc('list_projects_with_counts', {
          limit: validated.limit,
          offset: validated.offset,
        })
        .order(validated.order?.split('.')[0] || 'name', {
          ascending: validated.order?.endsWith('.asc') ?? true,
        });

      if (error) {
        console.error('[useProjects] Query error:', error);
        throw {
          error: {
            code: 500,
            message: 'Failed to fetch projects',
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

**4.2 Create `src/features/projects/api/useProject.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { projectIdSchema } from './projects.schemas';
import { projectsKeys } from './projects.keys';
import type { ProjectResponse, ApiError } from '@/shared/types';

export function useProject(projectId: string) {
  const supabase = useSupabase();

  return useQuery<ProjectResponse, ApiError>({
    queryKey: projectsKeys.detail(projectId),
    queryFn: async () => {
      // Validate project ID
      const validatedId = projectIdSchema.parse(projectId);

      const { data, error } = await supabase
        .from('projects')
        .select('id,name,description,prefix,default_locale,created_at,updated_at')
        .eq('id', validatedId)
        .maybeSingle();

      if (error) {
        console.error('[useProject] Query error:', error);
        throw {
          error: {
            code: 500,
            message: 'Failed to fetch project',
            details: { original: error },
          },
        };
      }

      if (!data) {
        throw {
          error: {
            code: 404,
            message: 'Project not found or access denied',
          },
        };
      }

      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
```

**4.3 Create `src/features/projects/api/useCreateProject.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createProjectSchema } from './projects.schemas';
import { projectsKeys } from './projects.keys';
import type { CreateProjectWithDefaultLocaleRequest, ProjectResponse, ApiError } from '@/shared/types';

export function useCreateProject() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectResponse, ApiError, CreateProjectWithDefaultLocaleRequest>({
    mutationFn: async (projectData) => {
      // Validate input
      const validated = createProjectSchema.parse(projectData);

      // Call RPC function to create project with default locale
      const { data, error } = await supabase.rpc('create_project_with_default_locale', validated).single();

      if (error) {
        console.error('[useCreateProject] RPC error:', error);

        // Handle unique constraint violations
        if (error.code === '23505') {
          if (error.message.includes('projects_name_unique_per_owner')) {
            throw {
              error: {
                code: 409,
                message: 'Project with this name already exists',
              },
            };
          }
          if (error.message.includes('projects_prefix_unique_per_owner')) {
            throw {
              error: {
                code: 409,
                message: 'Prefix is already in use',
              },
            };
          }
        }

        // Generic error
        throw {
          error: {
            code: 500,
            message: 'Failed to create project',
            details: { original: error },
          },
        };
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate project list cache
      queryClient.invalidateQueries({ queryKey: projectsKeys.lists() });
    },
  });
}
```

**4.4 Create `src/features/projects/api/useUpdateProject.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { updateProjectSchema, projectIdSchema } from './projects.schemas';
import { projectsKeys } from './projects.keys';
import type { UpdateProjectRequest, ProjectResponse, ApiError } from '@/shared/types';

export function useUpdateProject(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectResponse, ApiError, UpdateProjectRequest>({
    mutationFn: async (updateData) => {
      // Validate inputs
      const validatedId = projectIdSchema.parse(projectId);
      const validated = updateProjectSchema.parse(updateData);

      const { data, error } = await supabase
        .from('projects')
        .update(validated)
        .eq('id', validatedId)
        .select('id,name,description,prefix,default_locale,updated_at')
        .maybeSingle();

      if (error) {
        console.error('[useUpdateProject] Update error:', error);

        // Handle unique constraint violations
        if (error.code === '23505' && error.message.includes('projects_name_unique_per_owner')) {
          throw {
            error: {
              code: 409,
              message: 'Project with this name already exists',
            },
          };
        }

        // Handle trigger violations
        if (error.message.includes('prefix') || error.message.includes('default_locale')) {
          throw {
            error: {
              code: 400,
              message: 'Cannot modify prefix or default_locale after creation',
            },
          };
        }

        throw {
          error: {
            code: 500,
            message: 'Failed to update project',
            details: { original: error },
          },
        };
      }

      if (!data) {
        throw {
          error: {
            code: 404,
            message: 'Project not found or access denied',
          },
        };
      }

      return data;
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectsKeys.detail(projectId) });

      // Snapshot previous value
      const previousProject = queryClient.getQueryData(projectsKeys.detail(projectId));

      // Optimistically update
      queryClient.setQueryData(projectsKeys.detail(projectId), (old: ProjectResponse) => ({
        ...old,
        ...newData,
      }));

      return { previousProject };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(projectsKeys.detail(projectId), context.previousProject);
      }
    },
    onSuccess: () => {
      // Invalidate related caches
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.lists() });
    },
  });
}
```

**4.5 Create `src/features/projects/api/useDeleteProject.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { projectIdSchema } from './projects.schemas';
import { projectsKeys } from './projects.keys';
import type { ApiError } from '@/shared/types';

export function useDeleteProject() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (projectId) => {
      // Validate project ID
      const validatedId = projectIdSchema.parse(projectId);

      const { error, count } = await supabase.from('projects').delete().eq('id', validatedId);

      if (error) {
        console.error('[useDeleteProject] Delete error:', error);
        throw {
          error: {
            code: 500,
            message: 'Failed to delete project',
            details: { original: error },
          },
        };
      }

      if (count === 0) {
        throw {
          error: {
            code: 404,
            message: 'Project not found or access denied',
          },
        };
      }
    },
    onSuccess: (_, projectId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: projectsKeys.detail(projectId) });
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: projectsKeys.lists() });
    },
  });
}
```

### Step 5: Create API Index File

Create `src/features/projects/api/index.ts`:

```typescript
export { projectsKeys } from './projects.keys';
export { useProjects } from './useProjects';
export { useProject } from './useProject';
export { useCreateProject } from './useCreateProject';
export { useUpdateProject } from './useUpdateProject';
export { useDeleteProject } from './useDeleteProject';
export * from './projects.schemas';
```

### Step 6: Write Unit Tests

**6.1 Create `src/features/projects/api/useProjects.test.ts`:**

Test scenarios:

- Successful list fetch with default params
- Successful list fetch with custom pagination
- Successful list fetch with sorting
- Validation error for invalid params (limit > 100)
- Database error handling

**6.2 Create `src/features/projects/api/useProject.test.ts`:**

Test scenarios:

- Successful project fetch
- Invalid UUID format
- Project not found (404)
- RLS access denied (appears as 404)

**6.3 Create `src/features/projects/api/useCreateProject.test.ts`:**

Test scenarios:

- Successful project creation
- Validation error (invalid prefix)
- Duplicate name conflict (409)
- Duplicate prefix conflict (409)
- Database error

**6.4 Create `src/features/projects/api/useUpdateProject.test.ts`:**

Test scenarios:

- Successful update (name only)
- Successful update (description only)
- Successful update (both fields)
- Optimistic update and rollback on error
- Attempt to change prefix (400)
- Attempt to change default_locale (400)
- Duplicate name conflict (409)
- Project not found (404)

**6.5 Create `src/features/projects/api/useDeleteProject.test.ts`:**

Test scenarios:

- Successful deletion
- Invalid UUID format
- Project not found (404)
- Verify cache invalidation
