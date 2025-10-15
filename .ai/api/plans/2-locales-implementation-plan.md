# API Endpoint Implementation Plan: Project Locales

## 1. Endpoint Overview

The Project Locales API manages language configurations for translation projects. Each project can have multiple locales, with one designated as the default. The API consists of four endpoints that handle listing, creation, label updates, and deletion of project locales with proper authentication, authorization via RLS policies, and comprehensive validation.

### Key Features

- List all locales for a project with default locale identification
- Atomic locale creation with automatic fan-out of NULL translations for existing keys
- Label-only updates with immutability constraints on locale codes
- Protected deletion preventing removal of default locales
- Automatic locale code normalization via database triggers

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
    - `project_id` (UUID) - Project ID to fetch locales for
  - Optional: None
- **Request Body:** None

**Example Request:**

```http
GET /rest/v1/rpc/list_project_locales_with_default?project_id=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {access_token}
```

### 2.2 Add Locale to Project

- **HTTP Method:** POST
- **URL Structure:** `/rest/v1/project_locales`
- **Authentication:** Required
- **Parameters:** None
- **Request Body:**

```json
{
  "label": "Polski",
  "locale": "pl",
  "project_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Field Validation:**

- `project_id` (required, UUID) - Valid project ID owned by user
- `locale` (required, string) - BCP-47 locale code (ll or ll-CC), will be normalized
- `label` (required, string) - Human-readable label, max 64 chars, trimmed

### 2.3 Update Locale Label

- **HTTP Method:** PATCH
- **URL Structure:** `/rest/v1/project_locales?id=eq.{locale_id}`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `id` (UUID) - Locale record ID (via query filter)
- **Request Body:**

```json
{
  "label": "Polish (Poland)"
}
```

**Field Validation:**

- `label` (required, string) - New label, max 64 chars, trimmed
- `locale` and `project_id` are **immutable** and will trigger 400 error if included

### 2.4 Delete Locale

- **HTTP Method:** DELETE
- **URL Structure:** `/rest/v1/project_locales?id=eq.{locale_id}`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `id` (UUID) - Locale record ID (via query filter)
- **Request Body:** None

## 3. Used Types

### 3.1 Existing Types (from `src/shared/types/types.ts`)

```typescript
// Base database type (generated from Supabase)
export type ProjectLocale = Database['public']['Tables']['project_locales']['Row'];

// Response DTOs (to be added)
export type ProjectLocaleResponse = Pick<
  ProjectLocale,
  'id' | 'project_id' | 'locale' | 'label' | 'created_at' | 'updated_at'
>;

export interface ProjectLocaleWithDefault extends ProjectLocaleResponse {
  is_default: boolean;
}

// Request DTOs (to be added)
export interface CreateProjectLocaleRequest {
  project_id: string;
  locale: string;
  label: string;
}

export interface UpdateProjectLocaleRequest {
  label: string;
}

// Reuse existing error types
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ValidationErrorResponse extends ApiErrorResponse {
  error: {
    code: 'validation_error';
    message: string;
    details: {
      field: string;
      constraint: string;
    };
  };
}

export interface ConflictErrorResponse extends ApiErrorResponse {
  error: {
    code: 'conflict';
    message: string;
  };
}
```

### 3.2 New Zod Validation Schemas

Create validation schemas in `src/features/locales/api/locales.schemas.ts`:

```typescript
import { z } from 'zod';

// Locale code validation (BCP-47 format: ll or ll-CC)
const localeCodeSchema = z
  .string()
  .min(2, 'Locale code is required')
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
  });

// Label validation
const localeLabelSchema = z.string().min(1, 'Label is required').max(64, 'Label must be at most 64 characters').trim();

// Project ID validation
export const projectIdSchema = z.string().uuid('Invalid project ID format');

// Locale ID validation
export const localeIdSchema = z.string().uuid('Invalid locale ID format');

// List Project Locales Schema
export const listProjectLocalesSchema = z.object({
  project_id: projectIdSchema,
});

// Create Locale Schema
export const createProjectLocaleSchema = z.object({
  project_id: projectIdSchema,
  locale: localeCodeSchema,
  label: localeLabelSchema,
});

// Update Locale Schema
export const updateProjectLocaleSchema = z
  .object({
    label: localeLabelSchema,
    // Prevent immutable fields from being updated
    locale: z.never().optional(),
    project_id: z.never().optional(),
  })
  .strict();
```

## 4. Response Details

### 4.1 List Project Locales

**Success Response (200 OK):**

```json
[
  {
    "created_at": "2025-01-15T10:00:00Z",
    "id": "locale-uuid-1",
    "is_default": true,
    "label": "English",
    "locale": "en",
    "project_id": "project-uuid",
    "updated_at": "2025-01-15T10:00:00Z"
  },
  {
    "created_at": "2025-01-15T10:05:00Z",
    "id": "locale-uuid-2",
    "is_default": false,
    "label": "Polski",
    "locale": "pl",
    "project_id": "project-uuid",
    "updated_at": "2025-01-15T10:05:00Z"
  }
]
```

### 4.2 Add Locale to Project

**Success Response (201 Created):**

```json
{
  "created_at": "2025-01-15T10:05:00Z",
  "id": "locale-uuid",
  "label": "Polski",
  "locale": "pl",
  "project_id": "project-uuid",
  "updated_at": "2025-01-15T10:05:00Z"
}
```

### 4.3 Update Locale Label

**Success Response (200 OK):**

Returns array with single updated locale (Supabase convention):

```json
[
  {
    "created_at": "2025-01-15T10:05:00Z",
    "id": "locale-uuid",
    "label": "Polish (Poland)",
    "locale": "pl",
    "project_id": "project-uuid",
    "updated_at": "2025-01-15T11:00:00Z"
  }
]
```

### 4.4 Delete Locale

**Success Response (204 No Content)**

Empty response body.

### 4.5 Error Responses

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
      "constraint": "regex",
      "field": "locale"
    },
    "message": "Locale must be in BCP-47 format (e.g., \"en\" or \"en-US\")"
  }
}
```

**400 Bad Request (Immutable Field):**

```json
{
  "error": {
    "code": "validation_error",
    "message": "Cannot modify locale code after creation"
  }
}
```

**409 Conflict (Duplicate Locale):**

```json
{
  "error": {
    "code": "conflict",
    "message": "Locale already exists for this project"
  }
}
```

**409 Conflict (Default Locale Deletion):**

```json
{
  "error": {
    "code": "conflict",
    "message": "Cannot delete default locale"
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "not_found",
    "message": "Project locale not found or access denied"
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

## 5. Data Flow

### 5.1 List Project Locales Flow

1. User navigates to project locales page with project ID in URL
2. React component invokes `useProjectLocales` hook with project ID
3. Hook validates project ID using Zod schema
4. Hook retrieves Supabase client from `useSupabase()` context
5. Client calls RPC function `list_project_locales_with_default` with project ID
6. RPC function performs LEFT JOIN with `projects` table to determine `is_default` flag
7. RLS policy filters results by project ownership (`projects.owner_user_id = auth.uid()`)
8. If project doesn't exist or user lacks access, returns empty array
9. Results include `is_default` boolean for each locale
10. TanStack Query caches results with project-specific query key
11. Component renders locale list with default locale highlighted

### 5.2 Add Locale to Project Flow

1. User submits "Add Locale" form with locale code and label
2. `useCreateProjectLocale` mutation hook receives form data with project ID
3. Hook validates data using `createProjectLocaleSchema`
4. If validation fails, return 400 error immediately
5. Hook calls Supabase `.insert()` with validated data
6. Database triggers execute in sequence:
   - `normalize_locale_trigger`: Normalizes locale code (e.g., "EN-us" → "en-US")
   - Unique constraint checked on `(project_id, locale)`
   - If duplicate, PostgreSQL returns constraint violation → hook returns 409
7. **Critical:** `fan_out_translations_on_locale_insert_trigger` fires AFTER insert:
   - Queries all existing keys for the project
   - Creates translation records for new locale with `value = NULL`, `updated_source = 'user'`
   - This may be a long operation for projects with many keys (e.g., 10,000 keys)
8. Telemetry event `language_added` is emitted with `locale_count` property
9. On success, new locale data is returned
10. TanStack Query invalidates project locales cache
11. Component displays success message and updated locale list

### 5.3 Update Locale Label Flow

1. User submits inline edit for locale label
2. `useUpdateProjectLocale` mutation hook receives locale ID and new label
3. Hook validates data using `updateProjectLocaleSchema` (ensures no immutable fields)
4. Hook validates locale ID using UUID schema
5. Hook calls Supabase `.update({ label })` with `.eq('id', localeId)`
6. RLS policy validates ownership via project relationship
7. If unauthorized or not found, Supabase returns empty result → hook returns 404
8. If user attempts to modify `locale` or `project_id` fields, Zod validation fails → 400
9. `updated_at` timestamp is automatically updated by database trigger
10. On success, updated locale data is returned
11. TanStack Query updates cache with optimistic update and invalidates related queries
12. Component displays updated label immediately

### 5.4 Delete Locale Flow

1. User confirms locale deletion via confirmation dialog
2. `useDeleteProjectLocale` mutation hook receives locale ID
3. Hook validates UUID format
4. Hook calls Supabase `.delete().eq('id', localeId)`
5. **Critical:** Database trigger `prevent_default_locale_delete_trigger` checks if locale is project's default
6. If attempting to delete default locale, trigger raises exception → hook returns 409 with message
7. RLS policy validates ownership via project relationship
8. If unauthorized or not found, returns 404
9. PostgreSQL CASCADE DELETE removes all related data:
   - All `translations` rows for this locale (could be thousands of rows)
10. On success, Supabase returns 204 No Content
11. TanStack Query invalidates project locales cache
12. Component removes locale from displayed list

## 6. Security Considerations

### 6.1 Authentication

- All endpoints require valid JWT access token in `Authorization: Bearer {token}` header
- Token is obtained via Supabase Auth during sign-in
- Token is stored in Supabase client session and automatically included in requests
- Token expiration is handled by Supabase client with automatic refresh

### 6.2 Authorization

- Row-Level Security (RLS) policies enforce ownership through project relationship
- `project_locales` table RLS policies check `project_id` foreign key to `projects.owner_user_id = auth.uid()`
- Users can only access locales for their own projects
- RLS policies are defined in `supabase/migrations/20251013143400_create_rls_policies.sql`
- Policy names:
  - `project_locales_select_policy` - SELECT where project is owned by user
  - `project_locales_insert_policy` - INSERT where project is owned by user
  - `project_locales_update_policy` - UPDATE where project is owned by user
  - `project_locales_delete_policy` - DELETE where project is owned by user

### 6.3 Input Validation

- **Client-side validation:** Zod schemas validate all input before sending to backend
- **Database-level validation:** CHECK constraints enforce BCP-47 format
- **Immutability enforcement:** Zod schemas with `z.never()` prevent updates to `locale` and `project_id`
- **Unique constraints:** Database enforces uniqueness of `(project_id, locale)` pair
- **Normalization:** Database trigger normalizes locale codes to consistent format

### 6.4 Data Integrity

- **Default locale protection:** Trigger prevents deletion of project's default locale
- **Referential integrity:** Foreign key constraint ensures `project_id` exists
- **Cascade behavior:** Deleting locale cascades to all translations for that locale
- **Atomic operations:** Fan-out translation creation happens in single transaction

### 6.5 SQL Injection Prevention

- Supabase client uses parameterized queries for all operations
- Never construct raw SQL strings from user input
- RPC functions use typed parameters
- All UUIDs are validated before use in queries

### 6.6 Data Exposure

- Only expose locales for projects owned by authenticated user
- RLS policies prevent information leakage about other users' projects
- Return 404 for both "doesn't exist" and "access denied" to avoid leaking existence

### 6.7 Rate Limiting

- Supabase provides built-in rate limiting per IP address
- **Important:** Locale creation with fan-out can be expensive for large projects
- Consider implementing application-level rate limiting for locale creation
- Monitor database performance during fan-out operations

### 6.8 Mass Assignment Protection

- Zod schemas with `.strict()` prevent additional fields
- Immutable fields protected with `z.never()` type
- Database triggers provide defense-in-depth for business rules

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Invalid locale code format (not BCP-47)
- Empty or too long label (>64 chars)
- Invalid UUID format for project_id or locale_id
- Attempt to update immutable fields (`locale`, `project_id`)

**Handling:**

```typescript
try {
  const validatedData = createProjectLocaleSchema.parse(formData);
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

### 7.3 Authorization Errors (403/404)

**Trigger Conditions:**

- User attempts to access locales for project owned by another user
- RLS policy denies access

**Handling:**

- Supabase returns empty result set for SELECT queries
- Return 404 "Project locale not found or access denied" to avoid leaking existence
- Do not distinguish between "doesn't exist" and "access denied"

### 7.4 Conflict Errors (409)

**Trigger Conditions:**

- Duplicate locale for same project (unique constraint violation)
- Attempt to delete default locale (trigger prevention)

**Handling:**

- Catch PostgreSQL unique constraint violation error code `23505`
- Parse error message to determine cause
- Return user-friendly message

**Example:**

```typescript
const { data, error } = await supabase.from('project_locales').insert(validatedData).select().single();

if (error) {
  if (error.code === '23505') {
    // Unique constraint violation
    if (error.message.includes('project_locales_unique_per_project')) {
      return {
        error: {
          code: 'conflict',
          message: 'Locale already exists for this project',
        },
      };
    }
  }

  // Trigger preventing default locale deletion
  if (error.message.includes('default locale')) {
    return {
      error: {
        code: 'conflict',
        message: 'Cannot delete default locale',
      },
    };
  }
}
```

### 7.5 Not Found Errors (404)

**Trigger Conditions:**

- Project ID doesn't exist
- Locale ID doesn't exist
- RLS policy denies access (appears as not found)

**Handling:**

```typescript
const { data, error } = await supabase.from('project_locales').select('*').eq('id', localeId).maybeSingle();

if (!data) {
  return {
    error: {
      code: 'not_found',
      message: 'Project locale not found or access denied',
    },
  };
}
```

### 7.6 Server Errors (500)

**Trigger Conditions:**

- Database connection failure
- Trigger execution error during fan-out
- Unexpected constraint violation
- Cascade delete failure

**Handling:**

- Log full error details to console (development) or error tracking service (production)
- Return generic message to user: "An unexpected error occurred. Please try again."
- Do not expose internal error details to client

**Example:**

```typescript
const { data, error } = await supabase.from('project_locales').insert(validatedData).select().single();

if (error) {
  console.error('[useCreateProjectLocale] Insert error:', error);

  // Send to error tracking (e.g., Sentry)
  if (import.meta.env.PROD) {
    trackError(error);
  }

  return {
    error: {
      code: 'internal_server_error',
      message: 'An unexpected error occurred. Please try again.',
    },
  };
}
```

### 7.7 Network Errors

**Trigger Conditions:**

- Lost internet connection
- Supabase service unavailable
- Request timeout (especially during fan-out operations)

**Handling:**

- TanStack Query automatically retries failed requests (3 retries with exponential backoff)
- Display network error message with retry button
- Cache last successful data to show stale content
- Consider longer timeout for locale creation due to fan-out operation

## 8. Performance Considerations

### 8.1 Query Optimization

**Indexing:**

- Primary key index on `id` (auto-created)
- Composite unique index on `(project_id, locale)` for duplicate checking and fast lookups
- Foreign key index on `project_id` for efficient RLS filtering and joins
- Indexes defined in `supabase/migrations/20251013143200_create_indexes.sql`

**RPC Function for List:**

- `list_project_locales_with_default` uses efficient LEFT JOIN with `projects` table
- Single query returns all data including `is_default` flag
- Avoids N+1 queries for default locale checking

### 8.2 Fan-Out Performance

**Critical Consideration:**

- Locale creation triggers fan-out of NULL translations for **all existing keys** in project
- For project with 10,000 keys, this creates 10,000 translation rows
- Operation is atomic (single transaction) but can be slow
- Potential timeout for very large projects

**Optimization Strategies:**

1. **Progress Indication:** Display loading state during creation
2. **Timeout Configuration:** Increase request timeout for locale creation
3. **Background Processing:** Consider moving fan-out to background job for large projects (future enhancement)
4. **Batch Insert:** Database trigger should use batch insert for fan-out (verify implementation)

### 8.3 Caching Strategy

**TanStack Query Configuration:**

```typescript
// List project locales: 5-minute cache (changes infrequently)
staleTime: 5 * 60 * 1000,
gcTime: 10 * 60 * 1000,

// Single locale: 10-minute cache
staleTime: 10 * 60 * 1000,
gcTime: 30 * 60 * 1000,
```

**Cache Invalidation:**

- Create locale → invalidate project locales list cache
- Update locale → invalidate list cache and single locale cache
- Delete locale → invalidate list cache and remove from query cache
- **Important:** Also invalidate translation-related caches when locales change

### 8.4 Optimistic Updates

**Update Locale Label:**

```typescript
const updateMutation = useMutation({
  mutationFn: updateProjectLocale,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['project-locales', projectId] });

    // Snapshot previous value
    const previousLocales = queryClient.getQueryData(['project-locales', projectId]);

    // Optimistically update
    queryClient.setQueryData(['project-locales', projectId], (old: ProjectLocaleWithDefault[]) =>
      old.map((locale) => (locale.id === localeId ? { ...locale, ...newData } : locale))
    );

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

### 8.5 Cascade Delete Performance

- Deleting locale can cascade to thousands of translation rows
- PostgreSQL handles cascade efficiently with foreign key indexes
- Monitor database performance for projects with many translations
- Consider soft delete pattern for audit trail (future enhancement)

### 8.6 Payload Size

- Typical locale list response (5-10 locales): ~1-2 KB
- Single locale response: ~200 bytes
- Compression (gzip) enabled by default in Supabase

## 9. Implementation Steps

### Step 1: Add Type Definitions

Update `src/shared/types/types.ts` to include locale-specific types:

```typescript
// Response DTOs
export type ProjectLocaleResponse = Pick<
  ProjectLocale,
  'id' | 'project_id' | 'locale' | 'label' | 'created_at' | 'updated_at'
>;

export interface ProjectLocaleWithDefault extends ProjectLocaleResponse {
  is_default: boolean;
}

// Request DTOs
export interface CreateProjectLocaleRequest {
  project_id: string;
  locale: string;
  label: string;
}

export interface UpdateProjectLocaleRequest {
  label: string;
}
```

### Step 2: Create Feature Directory Structure

```bash
mkdir -p src/features/locales/{api,components,routes,hooks}
```

### Step 3: Create Zod Validation Schemas

Create `src/features/locales/api/locales.schemas.ts` with all validation schemas defined in section 3.2.

### Step 4: Create TanStack Query Hooks

**4.1 Create `src/features/locales/api/useProjectLocales.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { projectIdSchema } from './locales.schemas';
import type { ProjectLocaleWithDefault, ApiError } from '@/shared/types';

export const projectLocalesKeys = {
  all: ['project-locales'] as const,
  lists: () => [...projectLocalesKeys.all, 'list'] as const,
  list: (projectId: string) => [...projectLocalesKeys.lists(), projectId] as const,
  details: () => [...projectLocalesKeys.all, 'detail'] as const,
  detail: (localeId: string) => [...projectLocalesKeys.details(), localeId] as const,
};

export function useProjectLocales(projectId: string) {
  const supabase = useSupabase();

  return useQuery<ProjectLocaleWithDefault[], ApiError>({
    queryKey: projectLocalesKeys.list(projectId),
    queryFn: async () => {
      // Validate project ID
      const validatedProjectId = projectIdSchema.parse(projectId);

      // Call RPC function for list with is_default flag
      const { data, error } = await supabase
        .rpc('list_project_locales_with_default', {
          project_id: validatedProjectId,
        })
        .order('locale', { ascending: true });

      if (error) {
        console.error('[useProjectLocales] RPC error:', error);
        throw {
          error: {
            code: 'database_error',
            message: 'Failed to fetch project locales',
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

**4.2 Create `src/features/locales/api/useCreateProjectLocale.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createProjectLocaleSchema } from './locales.schemas';
import { projectLocalesKeys } from './useProjectLocales';
import type { CreateProjectLocaleRequest, ProjectLocaleResponse, ApiError } from '@/shared/types';

export function useCreateProjectLocale() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectLocaleResponse, ApiError, CreateProjectLocaleRequest>({
    mutationFn: async (localeData) => {
      // Validate input
      const validated = createProjectLocaleSchema.parse(localeData);

      // Insert new locale
      const { data, error } = await supabase
        .from('project_locales')
        .insert(validated)
        .select('id,project_id,locale,label,created_at,updated_at')
        .single();

      if (error) {
        console.error('[useCreateProjectLocale] Insert error:', error);

        // Handle unique constraint violations
        if (error.code === '23505') {
          if (error.message.includes('project_locales_unique_per_project')) {
            throw {
              error: {
                code: 'conflict',
                message: 'Locale already exists for this project',
              },
            };
          }
        }

        // Generic error
        throw {
          error: {
            code: 'internal_server_error',
            message: 'Failed to add locale to project',
            details: { original: error },
          },
        };
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate project locales cache
      queryClient.invalidateQueries({ queryKey: projectLocalesKeys.list(data.project_id) });
    },
  });
}
```

**4.3 Create `src/features/locales/api/useUpdateProjectLocale.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { updateProjectLocaleSchema, localeIdSchema } from './locales.schemas';
import { projectLocalesKeys } from './useProjectLocales';
import type { UpdateProjectLocaleRequest, ProjectLocaleResponse, ApiError } from '@/shared/types';

export function useUpdateProjectLocale(localeId: string, projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectLocaleResponse, ApiError, UpdateProjectLocaleRequest>({
    mutationFn: async (updateData) => {
      // Validate inputs
      const validatedId = localeIdSchema.parse(localeId);
      const validated = updateProjectLocaleSchema.parse(updateData);

      const { data, error } = await supabase
        .from('project_locales')
        .update(validated)
        .eq('id', validatedId)
        .select('id,project_id,locale,label,created_at,updated_at')
        .maybeSingle();

      if (error) {
        console.error('[useUpdateProjectLocale] Update error:', error);

        throw {
          error: {
            code: 'internal_server_error',
            message: 'Failed to update locale label',
            details: { original: error },
          },
        };
      }

      if (!data) {
        throw {
          error: {
            code: 'not_found',
            message: 'Project locale not found or access denied',
          },
        };
      }

      return data;
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectLocalesKeys.list(projectId) });

      // Snapshot previous value
      const previousLocales = queryClient.getQueryData(projectLocalesKeys.list(projectId));

      // Optimistically update
      queryClient.setQueryData(projectLocalesKeys.list(projectId), (old: ProjectLocaleResponse[] | undefined) =>
        old?.map((locale) => (locale.id === localeId ? { ...locale, ...newData } : locale))
      );

      return { previousLocales };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousLocales) {
        queryClient.setQueryData(projectLocalesKeys.list(projectId), context.previousLocales);
      }
    },
    onSuccess: () => {
      // Invalidate related caches
      queryClient.invalidateQueries({ queryKey: projectLocalesKeys.list(projectId) });
    },
  });
}
```

**4.4 Create `src/features/locales/api/useDeleteProjectLocale.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { localeIdSchema } from './locales.schemas';
import { projectLocalesKeys } from './useProjectLocales';
import type { ApiError } from '@/shared/types';

export function useDeleteProjectLocale(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (localeId) => {
      // Validate locale ID
      const validatedId = localeIdSchema.parse(localeId);

      const { error, count } = await supabase.from('project_locales').delete().eq('id', validatedId);

      if (error) {
        console.error('[useDeleteProjectLocale] Delete error:', error);

        // Check for default locale deletion prevention
        if (error.message.includes('default locale')) {
          throw {
            error: {
              code: 'conflict',
              message: 'Cannot delete default locale',
            },
          };
        }

        throw {
          error: {
            code: 'internal_server_error',
            message: 'Failed to delete locale',
            details: { original: error },
          },
        };
      }

      if (count === 0) {
        throw {
          error: {
            code: 'not_found',
            message: 'Project locale not found or access denied',
          },
        };
      }
    },
    onSuccess: () => {
      // Invalidate project locales cache
      queryClient.invalidateQueries({ queryKey: projectLocalesKeys.list(projectId) });
    },
  });
}
```

### Step 5: Create API Index File

Create `src/features/locales/api/index.ts`:

```typescript
export { useProjectLocales, projectLocalesKeys } from './useProjectLocales';
export { useCreateProjectLocale } from './useCreateProjectLocale';
export { useUpdateProjectLocale } from './useUpdateProjectLocale';
export { useDeleteProjectLocale } from './useDeleteProjectLocale';
export * from './locales.schemas';
```

### Step 6: Write Unit Tests

**6.1 Create `src/features/locales/api/useProjectLocales.test.ts`:**

Test scenarios:

- Successful locale list fetch for project
- Invalid project ID format (validation error)
- Empty locale list for new project
- RPC error handling
- Proper inclusion of `is_default` flag

**6.2 Create `src/features/locales/api/useCreateProjectLocale.test.ts`:**

Test scenarios:

- Successful locale creation
- Validation error (invalid BCP-47 format)
- Validation error (empty label)
- Duplicate locale conflict (409)
- Project not found or access denied (403/404)
- Verify cache invalidation after creation

**6.3 Create `src/features/locales/api/useUpdateProjectLocale.test.ts`:**

Test scenarios:

- Successful label update
- Optimistic update and rollback on error
- Attempt to change locale code (400)
- Attempt to change project_id (400)
- Locale not found (404)
- Verify cache invalidation

**6.4 Create `src/features/locales/api/useDeleteProjectLocale.test.ts`:**

Test scenarios:

- Successful locale deletion
- Attempt to delete default locale (409)
- Invalid UUID format
- Locale not found (404)
- Verify cascade deletion of translations
- Verify cache invalidation

### Step 7: Create Example Components

**7.1 Create `src/features/locales/components/ProjectLocalesList.tsx`:**

Component that uses `useProjectLocales` hook to display locales with default locale badge.

**7.2 Create `src/features/locales/components/AddLocaleForm.tsx`:**

Form component using `useCreateProjectLocale` mutation with:

- Locale code input with format validation
- Label input
- Loading state during fan-out operation
- Success/error feedback

**7.3 Create `src/features/locales/components/EditLocaleLabel.tsx`:**

Inline edit component using `useUpdateProjectLocale` mutation with:

- Optimistic updates
- Validation feedback
- Revert on error

**7.4 Create `src/features/locales/components/DeleteLocaleButton.tsx`:**

Confirmation dialog component using `useDeleteProjectLocale` mutation with:

- Warning for default locale (disabled state)
- Confirmation prompt mentioning cascade deletion of translations
- Loading state

### Step 8: Create Route Components

**8.1 Create `src/features/locales/routes/ProjectLocalesPage.tsx`:**

Page component that renders `ProjectLocalesList` with add/edit/delete actions.

**8.2 Create `src/features/locales/routes/AddLocalePage.tsx`:**

Dedicated page for adding locale (optional, could be modal instead).

### Step 9: Register Routes

Update `src/app/routes.ts` to include locale management routes:

```typescript
{
  path: '/projects/:projectId/locales',
  lazy: () => import('@/features/locales/routes/ProjectLocalesPage'),
},
{
  path: '/projects/:projectId/locales/new',
  lazy: () => import('@/features/locales/routes/AddLocalePage'),
},
```

### Step 10: Add Component Tests

Write tests for each component using Testing Library:

- User interactions (form submission, inline editing, deletion confirmation)
- Loading states (especially for locale creation with fan-out)
- Error states with proper error messages
- Success states with feedback
- Optimistic updates for label editing
- Default locale badge display
- Disabled delete button for default locale

### Step 11: Integration Testing

Test complete user flows:

1. User adds first locale to new project → sees it marked as default
2. User adds second locale → sees loading state → confirms both locales appear
3. User edits locale label → sees optimistic update → confirms server update
4. User attempts to add duplicate locale → sees conflict error
5. User attempts to delete default locale → sees error message
6. User deletes non-default locale → confirms it's removed and translations cascaded

### Step 12: Performance Testing

**Test fan-out operation:**

1. Create project with 1,000 keys
2. Add new locale and measure operation time
3. Verify all translations are created with NULL values
4. Check database query performance during fan-out
5. Test UI responsiveness during long operations

**Test cascade deletion:**

1. Create project with multiple locales and 1,000 keys
2. Delete non-default locale and measure operation time
3. Verify all translations are removed
4. Check database query performance during cascade

### Step 13: Documentation

**13.1 Add JSDoc comments to all hooks**

Include:

- Purpose and usage
- Parameter descriptions
- Return value structure
- Error scenarios
- Example usage

**13.2 Create `src/features/locales/README.md`:**

Document:

- Feature overview
- Available hooks and their usage
- BCP-47 locale code format requirements
- Fan-out operation behavior and performance considerations
- Default locale protection rules
- Example code snippets
- Common patterns and best practices

### Step 14: Accessibility Review

- Ensure all forms have proper labels and ARIA attributes
- Test keyboard navigation for inline editing
- Verify screen reader announces locale additions/deletions
- Check focus management after mutations
- Ensure error messages are announced to assistive technologies
- Add ARIA live regions for optimistic updates

### Step 15: Final Review and Deployment

- Run `npm run lint` and fix any issues
- Run `npm run test` and ensure 100% coverage for API layer
- Test with real Supabase instance and verify triggers work correctly
- Verify RLS policies prevent unauthorized access
- Test fan-out performance with realistic data volume
- Update `.ai/api/plans/locales-implementation-plan.md` with any changes
- Create pull request with comprehensive description
- Request code review from team members
- Merge and deploy to staging environment
- Monitor error tracking for any production issues
- Monitor database performance metrics for fan-out and cascade operations
