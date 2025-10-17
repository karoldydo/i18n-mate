# API Endpoint Implementation Plan: Project Locales

## 1. Endpoint Overview

The Project Locales API manages languages assigned to translation projects. It provides CRUD operations for adding, listing, updating, and removing locales with proper validation, authorization via RLS policies, and automatic translation fan-out. The API ensures that the default locale cannot be deleted and that all locale codes are normalized to BCP-47 format.

### Key Features

- List project locales with optional `is_default` flag via RPC helper
- Atomic locale creation with automatic NULL translation fan-out to all existing keys
- Label-only updates with locale code immutability enforcement
- Protected deletion that prevents removal of default locale
- Automatic locale code normalization (ll or ll-CC format)

### Endpoints Summary

1. **List Project Locales** - `GET /rest/v1/rpc/list_project_locales_with_default`
2. **Add Locale to Project** - `POST /rest/v1/project_locales`
3. **Update Locale Label** - `PATCH /rest/v1/project_locales?id=eq.{locale_id}`
4. **Delete Locale** - `DELETE /rest/v1/project_locales?id=eq.{locale_id}`

## 2. Request Details

### 2.1 List Project Locales

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/rpc/list_project_locales_with_default?project_id={project_id}`
- **Authentication:** Required (JWT via Authorization header)
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project ID
  - Optional: None
- **Request Body:** None

**Example Request:**

```http
GET /rest/v1/rpc/list_project_locales_with_default?project_id=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {access_token}
```

### 2.2 Add Locale to Project (Atomic - Recommended)

- **HTTP Method:** POST
- **URL Structure:** `/rest/v1/rpc/create_project_locale_atomic`
- **Authentication:** Required
- **Parameters:** None
- **Request Body:**

```json
{
  "p_label": "Polski",
  "p_locale": "pl",
  "p_project_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Field Validation:**

- `p_project_id` (required, UUID) - Project ID
- `p_locale` (required, string) - BCP-47 locale code (ll or ll-CC format, normalized automatically)
- `p_label` (required, string) - Human-readable locale label (max 64 characters, trimmed)

**Advantages of Atomic Approach:**

- Built-in fan-out verification ensures all translation records are created
- Better error reporting with specific error codes for troubleshooting
- Atomic operation (all-or-nothing) prevents partial state
- Automatic telemetry event emission for analytics
- Enhanced retry logic for transient failures
- Rollback on any step failure

**Alternative (Legacy):** Simple `POST /rest/v1/project_locales` is still available but not recommended for production use due to lack of verification and weaker error handling.

### 2.3 Update Locale Label

- **HTTP Method:** PATCH
- **URL Structure:** `/rest/v1/project_locales?id=eq.{locale_id}`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `id` (UUID) - Locale ID (via query filter)
- **Request Body:**

```json
{
  "label": "Polish (Poland)"
}
```

**Field Validation:**

- `label` (required, string) - New locale label (max 64 characters, trimmed)
- `locale` field is **immutable** and will trigger 400 error if included

### 2.4 Delete Locale

- **HTTP Method:** DELETE
- **URL Structure:** `/rest/v1/project_locales?id=eq.{locale_id}`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `id` (UUID) - Locale ID (via query filter)
- **Request Body:** None

## 3. Used Types

### 3.1 Existing Types (from `src/shared/types/types.ts`)

```typescript
// Response DTOs
export type ProjectLocaleResponse = ProjectLocale;

export type ProjectLocaleWithDefault = ProjectLocaleResponse & {
  is_default: boolean;
};

// Request DTOs
export type CreateProjectLocaleRequest = Pick<ProjectLocaleInsert, 'label' | 'locale' | 'project_id'>;

export type UpdateProjectLocaleRequest = Pick<ProjectLocaleUpdate, 'label'>;

// RPC Function Arguments
export interface ListProjectLocalesWithDefaultArgs {
  project_id: string;
}

// Error types (already defined)
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

Create validation schemas in `src/features/locales/api/locales.schemas.ts`:

```typescript
import { z } from 'zod';

// Locale code validation (BCP-47 format: ll or ll-CC)
const localeCodeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// Locale label validation
const localeLabelSchema = z
  .string()
  .min(1, 'Locale label is required')
  .max(64, 'Locale label must be at most 64 characters')
  .trim();

// List Project Locales with Default Schema
export const listProjectLocalesWithDefaultSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
});

// Create Project Locale Request Schema
export const createProjectLocaleSchema = z.object({
  label: localeLabelSchema,
  locale: localeCodeSchema,
  project_id: z.string().uuid('Invalid project ID format'),
});

// Update Project Locale Schema (label only, locale is immutable)
export const updateProjectLocaleSchema = z
  .object({
    label: localeLabelSchema.optional(),
    // Prevent immutable field
    locale: z.never().optional(),
  })
  .strict();

// Locale ID Schema
export const localeIdSchema = z.string().uuid('Invalid locale ID format');

// Response Schemas for runtime validation
export const projectLocaleResponseSchema = z.object({
  created_at: z.string(),
  id: z.string().uuid(),
  label: z.string(),
  locale: z.string(),
  project_id: z.string().uuid(),
  updated_at: z.string(),
});

export const projectLocaleWithDefaultSchema = projectLocaleResponseSchema.extend({
  is_default: z.boolean(),
});
```

## 4. Response Details

### 4.1 List Project Locales

**Success Response (200 OK):**

```json
[
  {
    "created_at": "2025-01-15T10:00:00Z",
    "id": "uuid",
    "is_default": true,
    "label": "English",
    "locale": "en",
    "project_id": "uuid",
    "updated_at": "2025-01-15T10:00:00Z"
  },
  {
    "created_at": "2025-01-15T10:05:00Z",
    "id": "uuid",
    "is_default": false,
    "label": "Polski",
    "locale": "pl",
    "project_id": "uuid",
    "updated_at": "2025-01-15T10:05:00Z"
  }
]
```

### 4.2 Add Locale to Project (Atomic)

**Success Response (201 Created):**

```json
{
  "created_at": "2025-01-15T10:05:00Z",
  "id": "uuid",
  "label": "Polski",
  "locale": "pl",
  "project_id": "uuid",
  "updated_at": "2025-01-15T10:05:00Z"
}
```

**Enhanced Error Responses (Atomic-specific):**

```json
{
  "data": null,
  "error": {
    "code": 500,
    "details": {
      "code": "FANOUT_VERIFICATION_FAILED"
    },
    "message": "Failed to initialize translations for new locale"
  }
}
```

```json
{
  "data": null,
  "error": {
    "code": 500,
    "details": {
      "actual": 147,
      "code": "FANOUT_INCOMPLETE",
      "expected": 150
    },
    "message": "Incomplete translation initialization"
  }
}
```

### 4.3 Update Locale Label

**Success Response (200 OK):**

```json
{
  "created_at": "2025-01-15T10:05:00Z",
  "id": "uuid",
  "label": "Polish (Poland)",
  "locale": "pl",
  "project_id": "uuid",
  "updated_at": "2025-01-15T11:00:00Z"
}
```

### 4.4 Delete Locale

**Success Response (204 No Content)**

Empty response body.

### 4.5 Error Responses

All error responses follow the structure: `{ data: null, error: { code, message, details? } }`

**400 Bad Request (Validation Error):**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "details": {
      "constraint": "regex",
      "field": "locale"
    },
    "message": "Locale must be in BCP-47 format (e.g., \"en\" or \"en-US\")"
  }
}
```

**400 Bad Request (Default Locale Deletion Attempt):**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "message": "Cannot delete default locale"
  }
}
```

**400 Bad Request (Immutable Field):**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "message": "Cannot modify locale code after creation"
  }
}
```

**409 Conflict:**

```json
{
  "data": null,
  "error": {
    "code": 409,
    "message": "Locale already exists for this project"
  }
}
```

**404 Not Found:**

```json
{
  "data": null,
  "error": {
    "code": 404,
    "message": "Locale not found or access denied"
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

### 5.1 List Project Locales Flow

1. User requests project locales via React component
2. TanStack Query hook (`useProjectLocales`) is invoked with project ID
3. Hook validates project ID using Zod schema
4. Hook retrieves Supabase client from `useSupabase()` context
5. Client calls RPC function `list_project_locales_with_default` with validated project ID
6. RLS policy filters results by project ownership (`owner_user_id = auth.uid()` on projects table)
7. PostgreSQL executes query with LEFT JOIN to projects table to add `is_default` flag
8. Results are returned as array with `is_default` boolean for each locale
9. Hook validates response data using Zod schema
10. TanStack Query caches results
11. Component renders locale list with default locale indicator

### 5.2 Add Locale to Project Flow

1. User submits add locale form
2. `useCreateProjectLocale` mutation hook receives form data
3. Hook validates data using `createProjectLocaleSchema`
4. If validation fails, return 400 error immediately
5. Hook calls Supabase `.insert()` with validated data
6. Database trigger `normalize_locale_trigger` normalizes locale code (ll or ll-CC format)
7. Database enforces unique constraint on `(project_id, locale)`
8. On conflict, PostgreSQL returns unique violation error → hook returns 409
9. If successful, database trigger `fan_out_translations_on_locale_insert_trigger` executes:

- Creates translation records for all existing keys in the project
- Sets `value = NULL` (missing translation)
- Sets `updated_source = 'user'`

10. Database trigger `emit_language_added_event_trigger` emits telemetry event:

- Event name: `language_added`
- Properties: `locale` (added locale code) and `locale_count` (total locales in project)
- Used for KPI tracking: projects with 2+ languages after 7 days from creation

  **Example Telemetry Event:**

  ```json
  {
    "created_at": "2025-01-15T10:05:00Z",
    "event_name": "language_added",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "properties": {
      "locale": "pl",
      "locale_count": 2
    }
  }
  ```

11. On success, new locale data is returned
12. TanStack Query invalidates project locales cache
13. Component displays success message and updated locale list

### 5.3 Update Locale Label Flow

1. User submits locale label update form
2. `useUpdateProjectLocale` mutation hook receives locale ID and update data
3. Hook validates data using `updateProjectLocaleSchema` (ensures no immutable fields)
4. Hook validates locale ID using UUID schema
5. Hook calls Supabase `.update()` with validated data and `.eq('id', localeId)`
6. RLS policy validates ownership via project relationship
7. If unauthorized or not found, Supabase returns empty result → hook returns 404
8. Database trigger `update_project_locales_updated_at` updates `updated_at` timestamp
9. On success, updated locale data is returned
10. TanStack Query updates cache and invalidates related queries
11. Component displays success message

### 5.4 Delete Locale Flow

1. User confirms locale deletion
2. `useDeleteProjectLocale` mutation hook receives locale ID
3. Hook validates UUID format
4. Hook calls Supabase `.delete().eq('id', localeId)`
5. Database trigger `prevent_default_locale_delete_trigger` checks if locale is default:
   - Queries projects table to find default_locale
   - If locale matches default_locale, raises exception → hook returns 400
6. RLS policy validates ownership via project relationship
7. If unauthorized or not found, returns 404
8. PostgreSQL CASCADE DELETE removes all related data:
   - `translations` rows for this locale
9. On success, Supabase returns 204 No Content
10. TanStack Query invalidates project locales cache
11. Component displays success message and updated locale list

## 6. Security Considerations

### 6.1 Authentication

- All endpoints require valid JWT access token in `Authorization: Bearer {token}` header
- Token is obtained via Supabase Auth during sign-in
- Token is stored in Supabase client session and automatically included in requests
- Token expiration is handled by Supabase client with automatic refresh

### 6.2 Authorization

- Row-Level Security (RLS) policies enforce project ownership validation
- RLS is applied on `project_locales` table via foreign key to `projects` table
- Users can only access locales for projects they own
- RLS policies are defined in `supabase/migrations/20251013143400_create_rls_policies.sql`
- Policy names:
  - `project_locales_select_policy` - SELECT where project.owner_user_id = auth.uid()
  - `project_locales_insert_policy` - INSERT where project.owner_user_id = auth.uid()
  - `project_locales_update_policy` - UPDATE where project.owner_user_id = auth.uid()
  - `project_locales_delete_policy` - DELETE where project.owner_user_id = auth.uid()

### 6.3 Input Validation

- **Client-side validation:** Zod schemas validate all input before sending to backend
- **Database-level validation:** CHECK constraints and triggers enforce data integrity
- **Locale normalization:** Database trigger (`normalize_locale_trigger`) normalizes locale codes to ll or ll-CC format
- **Immutability enforcement:** Client-side strict schema prevents modification of `locale` field
- **Default locale protection:** Database trigger (`prevent_default_locale_delete_trigger`) prevents deletion
- **Unique constraints:** Database enforces uniqueness of `(project_id, locale)`

### 6.4 SQL Injection Prevention

- Supabase client uses parameterized queries for all operations
- Never construct raw SQL strings from user input
- RPC functions use typed parameters

### 6.5 Data Exposure

- All fields are safe to expose in API responses
- RLS policies ensure users can only access their own project's locales

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Empty or invalid locale label
- Invalid locale code format (not BCP-47: ll or ll-CC)
- Invalid UUID format (project_id, locale_id)
- Attempt to modify `locale` field in update request
- Label exceeds 64 characters

**Handling:**

Zod validation errors are automatically converted to ApiErrorResponse format by the global QueryClient error handler configured in `src/app/config/queryClient/queryClient.ts`. This ensures consistent error format across all queries and mutations without requiring try/catch blocks in individual hooks.

**Result Format:**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "details": {
      "constraint": "regex",
      "field": "locale"
    },
    "message": "Locale must be in BCP-47 format (e.g., \"en\" or \"en-US\")"
  }
}
```

### 7.2 Authorization Errors (403/404)

**Trigger Conditions:**

- User attempts to access locale for project owned by another user
- RLS policy denies access

**Handling:**

- Supabase returns empty result set for SELECT queries
- Return 404 "Locale not found or access denied" to avoid leaking existence
- Do not distinguish between "doesn't exist" and "access denied"

### 7.3 Conflict Errors (409)

**Trigger Conditions:**

- Duplicate locale for same project (unique constraint: `project_locales_unique_per_project`)

**Handling:**

- Catch PostgreSQL unique constraint violation error code `23505`
- Parse error message to determine conflict type
- Return user-friendly message: "Locale already exists for this project"

**Example:**

```typescript
const { data, error } = await supabase.from('project_locales').insert(validatedData).select().single();

if (error) {
  throw createDatabaseErrorResponse(error, 'useCreateProjectLocale', 'Failed to add locale');
}

// The createDatabaseErrorResponse function handles the error mapping:
// - 23505 with 'project_locales_unique_per_project' -> 409 'Locale already exists for this project'
```

### 7.4 Database Trigger Errors (400)

**Trigger Conditions:**

- Attempt to delete default locale (prevented by `prevent_default_locale_delete_trigger`)

**Handling:**

- Catch PostgreSQL RAISE EXCEPTION from trigger
- Return 400 with specific message: "Cannot delete default locale" (trigger: `prevent_default_locale_delete_trigger`)

### 7.5 Not Found Errors (404)

**Trigger Conditions:**

- Locale ID doesn't exist
- Project ID doesn't exist
- RLS policy denies access (appears as not found)

**Handling:**

```typescript
import { createApiErrorResponse } from '@/shared/utils';

const { data, error } = await supabase.from('project_locales').select('*').eq('id', localeId).maybeSingle();

if (!data) {
  throw createApiErrorResponse(404, 'Locale not found or access denied');
}
```

### 7.6 Server Errors (500)

**Trigger Conditions:**

- Database connection failure
- RPC function execution error
- Fan-out trigger failure (`fan_out_translations_on_locale_insert_trigger`)
- Cascade delete failure

**Handling:**

- Log full error details to console (development)
- Return generic message to user: "An unexpected error occurred. Please try again."
- Do not expose internal error details to client

**Example:**

```typescript
const { data, error } = await supabase.from('project_locales').insert(validatedData).select().single();

if (error) {
  throw createDatabaseErrorResponse(error, 'useCreateProjectLocale', 'Failed to add locale');
}

// The createDatabaseErrorResponse function logs the error and returns a structured ApiErrorResponse
// For unknown errors, it returns a 500 status with the fallback message
```

## 8. Performance Considerations

### 8.1 Query Optimization

**Indexing:**

- Primary key index on `id` (auto-created)
- Composite unique index on `(project_id, locale)` for fast duplicate checking and lookup
- Foreign key index on `project_id` for efficient RLS filtering and joins
- Indexes defined in `supabase/migrations/20251013143200_create_indexes.sql`

**RPC Function Optimization:**

- `list_project_locales_with_default` uses efficient LEFT JOIN with projects table
- No N+1 queries; single query returns all locales with default flag

**Selective Fetching:**

- Always fetch all fields (locales table is small with only 6 columns)
- No pagination needed (typical project has < 20 locales)

### 8.2 Caching Strategy

**TanStack Query Configuration:**

```typescript
// List project locales: 10-minute cache
staleTime: 10 * 60 * 1000,
gcTime: 30 * 60 * 1000,

// Single locale: 15-minute cache (rarely accessed)
staleTime: 15 * 60 * 1000,
gcTime: 30 * 60 * 1000,
```

**Cache Invalidation:**

- Add locale → invalidate project locales list cache
- Update locale → invalidate project locales list cache and single locale cache (if exists)
- Delete locale → invalidate project locales list cache and remove from query cache

### 8.3 Optimistic Updates

**Update Locale Label:**

```typescript
const updateMutation = useMutation({
  mutationFn: updateLocale,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['project-locales', projectId] });

    // Snapshot previous value
    const previousLocales = queryClient.getQueryData(['project-locales', projectId]);

    // Optimistically update
    queryClient.setQueryData(['project-locales', projectId], (old) => {
      return old?.map((locale) => (locale.id === localeId ? { ...locale, ...newData } : locale));
    });

    return { previousLocales };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['project-locales', projectId], context.previousLocales);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['project-locales', projectId] });
  },
});
```

### 8.4 Database Performance

**Fan-Out Trigger Optimization:**

- `fan_out_translations_on_locale_insert_trigger` uses single INSERT with SELECT
- Efficient for projects with many keys (batch insert vs. N individual inserts)
- Trigger uses `SECURITY DEFINER` to bypass RLS during fan-out

**Cascade Delete Optimization:**

- CASCADE DELETE on translations is efficient due to composite primary key index
- Index on `(project_id, key_id, locale)` ensures fast deletion

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

```bash
mkdir -p src/features/locales/api
```

### Step 2: Create Zod Validation Schemas

Create `src/features/locales/api/locales.schemas.ts` with all validation schemas defined in section 3.2.

### Step 2.5: Create Error Handling Utilities

Create `src/features/locales/api/locales.errors.ts`:

```typescript
import type { PostgrestError } from '@supabase/supabase-js';
import type { ApiErrorResponse } from '@/shared/types';
import { createApiErrorResponse } from '@/shared/utils';

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors including:
 * - Unique constraint violations (23505)
 * - Check constraint violations (23514)
 * - Foreign key violations (23503)
 * - Trigger violations (default locale deletion)
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
    if (error.message.includes('project_locales_unique_per_project')) {
      return createApiErrorResponse(409, 'Locale already exists for this project');
    }
  }

  // Handle trigger violations (default locale deletion)
  if (error.message.includes('Cannot delete default_locale')) {
    return createApiErrorResponse(400, 'Cannot delete default locale');
  }

  // Handle check constraint violations
  if (error.code === '23514') {
    return createApiErrorResponse(400, 'Invalid field value', { constraint: error.details });
  }

  // Handle foreign key violations
  if (error.code === '23503') {
    return createApiErrorResponse(404, 'Project not found');
  }

  // Generic database error
  return createApiErrorResponse(500, fallbackMessage || 'Database operation failed', { original: error });
}
```

### Step 3: Create Query Keys Factory

Create `src/features/locales/api/locales.keys.ts`:

```typescript
/**
 * Query key factory for project locales
 * Follows TanStack Query best practices for structured query keys
 */
export const localesKeys = {
  all: ['project-locales'] as const,
  detail: (id: string) => [...localesKeys.details(), id] as const,
  details: () => [...localesKeys.all, 'detail'] as const,
  list: (projectId: string) => [...localesKeys.lists(), projectId] as const,
  lists: () => [...localesKeys.all, 'list'] as const,
};
```

**Note:** Properties are ordered alphabetically for consistency and easier code navigation.

### Step 4: Create TanStack Query Hooks

**4.1 Create `src/features/locales/api/useProjectLocales/useProjectLocales.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { ApiErrorResponse, ProjectLocaleWithDefault } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';
import { createDatabaseErrorResponse } from '../locales.errors';
import { localesKeys } from '../locales.keys';
import { listProjectLocalesWithDefaultSchema, projectLocaleWithDefaultSchema } from '../locales.schemas';

export function useProjectLocales(projectId: string) {
  const supabase = useSupabase();

  return useQuery<ProjectLocaleWithDefault[], ApiErrorResponse>({
    gcTime: 30 * 60 * 1000, // 30 minutes
    queryFn: async () => {
      // Validate project ID
      const validated = listProjectLocalesWithDefaultSchema.parse({ project_id: projectId });

      // Call RPC function for list with is_default flag
      const { data, error } = await supabase.rpc('list_project_locales_with_default', {
        project_id: validated.project_id,
      });

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProjectLocales', 'Failed to fetch project locales');
      }

      if (!data) {
        throw createApiErrorResponse(500, 'No data returned from server');
      }

      // Runtime validation of response data
      const locales = z.array(projectLocaleWithDefaultSchema).parse(data);

      return locales;
    },
    queryKey: localesKeys.list(projectId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

**4.2 Create `src/features/locales/api/useCreateProjectLocale/useCreateProjectLocale.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiErrorResponse, CreateProjectLocaleRequest, ProjectLocaleResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';
import { createDatabaseErrorResponse } from '../locales.errors';
import { localesKeys } from '../locales.keys';
import { createProjectLocaleSchema, projectLocaleResponseSchema } from '../locales.schemas';

export function useCreateProjectLocale(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectLocaleResponse, ApiErrorResponse, CreateProjectLocaleRequest>({
    mutationFn: async (localeData) => {
      // Validate input
      const validated = createProjectLocaleSchema.parse(localeData);

      // Insert locale (triggers normalization and fan-out)
      const { data, error } = await supabase.from('project_locales').insert(validated).select().single();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useCreateProjectLocale', 'Failed to add locale');
      }

      if (!data) {
        throw createApiErrorResponse(500, 'No data returned from server');
      }

      // Runtime validation of response data
      const validatedResponse = projectLocaleResponseSchema.parse(data);
      return validatedResponse;
    },
    onSuccess: () => {
      // Invalidate project locales list cache
      queryClient.invalidateQueries({ queryKey: localesKeys.list(projectId) });
    },
  });
}
```

**4.3 Create `src/features/locales/api/useUpdateProjectLocale/useUpdateProjectLocale.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ApiErrorResponse,
  ProjectLocaleResponse,
  ProjectLocaleWithDefault,
  UpdateProjectLocaleRequest,
} from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';
import { createDatabaseErrorResponse } from '../locales.errors';
import { localesKeys } from '../locales.keys';
import { localeIdSchema, projectLocaleResponseSchema, updateProjectLocaleSchema } from '../locales.schemas';

/**
 * Context type for mutation callbacks
 */
interface UpdateProjectLocaleContext {
  previousLocales?: ProjectLocaleWithDefault[];
}

export function useUpdateProjectLocale(projectId: string, localeId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectLocaleResponse, ApiErrorResponse, UpdateProjectLocaleRequest, UpdateProjectLocaleContext>({
    mutationFn: async (updateData) => {
      // Validate inputs
      const validatedId = localeIdSchema.parse(localeId);
      const validatedInput = updateProjectLocaleSchema.parse(updateData);

      const { data, error } = await supabase
        .from('project_locales')
        .update(validatedInput)
        .eq('id', validatedId)
        .select()
        .single();

      // Handle database errors
      if (error) {
        throw createDatabaseErrorResponse(error, 'useUpdateProjectLocale', 'Failed to update locale');
      }

      // Handle missing data (locale not found or access denied)
      if (!data) {
        throw createApiErrorResponse(404, 'Locale not found or access denied');
      }

      // Runtime validation of response data
      const validatedResponse = projectLocaleResponseSchema.parse(data);
      return validatedResponse;
    },
    onError: (_err, _newData, context) => {
      // Rollback on error
      if (context?.previousLocales) {
        queryClient.setQueryData(localesKeys.list(projectId), context.previousLocales);
      }
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: localesKeys.list(projectId) });

      // Snapshot previous value
      const previousLocales = queryClient.getQueryData<ProjectLocaleWithDefault[]>(localesKeys.list(projectId));

      // Optimistically update
      queryClient.setQueryData(localesKeys.list(projectId), (old: ProjectLocaleWithDefault[] | undefined) => {
        // Guard clause: prevent errors if cache is empty
        if (!old) return old;
        return old.map((locale) => (locale.id === localeId ? { ...locale, ...newData } : locale));
      });

      return { previousLocales };
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: localesKeys.list(projectId) });
    },
  });
}
```

**4.4 Create `src/features/locales/api/useDeleteProjectLocale/useDeleteProjectLocale.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiErrorResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';
import { createDatabaseErrorResponse } from '../locales.errors';
import { localesKeys } from '../locales.keys';
import { localeIdSchema } from '../locales.schemas';

export function useDeleteProjectLocale(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<void, ApiErrorResponse, string>({
    mutationFn: async (localeId) => {
      // Validate locale ID
      const validatedId = localeIdSchema.parse(localeId);

      const { error } = await supabase.from('project_locales').delete().eq('id', validatedId);

      if (error) {
        throw createDatabaseErrorResponse(error, 'useDeleteProjectLocale', 'Failed to delete locale');
      }
    },
    onSuccess: () => {
      // Invalidate project locales list cache
      queryClient.invalidateQueries({ queryKey: localesKeys.list(projectId) });
    },
  });
}
```

### Step 5: Create API Index File

Create `src/features/locales/api/index.ts`:

```typescript
/**
 * Project Locales API
 *
 * This module provides TanStack Query hooks for managing languages assigned to projects.
 * All hooks use the shared Supabase client from context and follow React Query best practices.
 *
 * @module features/locales/api
 */

// Error Utilities
export { createDatabaseErrorResponse } from './locales.errors';

// Query Keys
export { localesKeys } from './locales.keys';

// Validation Schemas
export * from './locales.schemas';

// Mutation Hooks
export { useCreateProjectLocale } from './useCreateProjectLocale/useCreateProjectLocale';
export { useDeleteProjectLocale } from './useDeleteProjectLocale/useDeleteProjectLocale';
export { useUpdateProjectLocale } from './useUpdateProjectLocale/useUpdateProjectLocale';

// Query Hooks
export { useProjectLocales } from './useProjectLocales/useProjectLocales';
```

**Organization:**

- Error utilities are exported first for use in other features
- Query keys factory for cache management
- Validation schemas for input/output validation
- Hooks grouped by type (mutations vs queries)
- Alphabetical order within each group for easy discovery
- Each hook is exported from its subdirectory with full path for clarity

### Step 6: Write Unit Tests

**6.1 Create `src/features/locales/api/useProjectLocales/useProjectLocales.test.ts`:**

Test scenarios:

- Successful list fetch with default locale flag
- Empty results (new project with only default locale)
- Validation error for invalid project ID (not UUID)
- Database error handling
- Multiple locales with correct is_default flags
- RLS access denied (appears as database error)

**6.2 Create `src/features/locales/api/useCreateProjectLocale/useCreateProjectLocale.test.ts`:**

Test scenarios:

- Successful locale creation with normalization (en-us → en-US)
- Validation error (invalid locale format)
- Validation error (empty label)
- Validation error (label too long > 64 chars)
- Duplicate locale conflict (409)
- Database error (project not found)
- Fan-out trigger execution (verify translations created)

**6.3 Create `src/features/locales/api/useUpdateProjectLocale/useUpdateProjectLocale.test.ts`:**

Test scenarios:

- Successful update (label only)
- Optimistic update and rollback on error
- Attempt to change locale (400 - blocked by strict schema)
- Locale not found (404)
- Empty label (400)
- Label too long > 64 chars (400)

**6.4 Create `src/features/locales/api/useDeleteProjectLocale/useDeleteProjectLocale.test.ts`:**

Test scenarios:

- Successful deletion (non-default locale)
- Attempt to delete default locale (400 - trigger prevents)
- Invalid UUID format
- Locale not found (404)
- Verify cache invalidation
- Verify cascade delete of translations
