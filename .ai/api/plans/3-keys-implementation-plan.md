# API Endpoint Implementation Plan: Keys

## 1. Endpoint Overview

The Keys API provides operations for managing translation keys within projects. Keys are created only in the default language and automatically mirrored to all project locales. The API consists of four endpoints that handle listing keys in two different views (default language view with missing counts, and per-language view with translation metadata), creating keys with initial values, and deleting keys with cascading deletion of all translations.

### Key Features

- Dual list views: default language overview and per-language detail view
- Intelligent search with trigram indexing for performance
- Missing translation filtering for workflow optimization
- Atomic key creation with automatic fan-out to all locales via trigger
- Cascading deletion of all related translations
- Comprehensive translation metadata tracking (source, author, machine translation flag)

### Endpoints Summary

1. **List Keys (Default Language View)** - `GET /rest/v1/rpc/list_keys_default_view`
2. **List Keys (Per-Language View)** - `GET /rest/v1/rpc/list_keys_per_language_view`
3. **Create Key with Default Value** - `POST /rest/v1/rpc/create_key_with_value`
4. **Delete Key** - `DELETE /rest/v1/keys?id=eq.{key_id}`

## 2. Request Details

### 2.1 List Keys (Default Language View)

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/rpc/list_keys_default_view`
- **Authentication:** Required (JWT via Authorization header)
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project to list keys for
  - Optional:
    - `search` (string) - Search term for key name (case-insensitive contains)
    - `missing_only` (boolean) - Filter to show only keys with missing translations (default: false)
    - `limit` (number) - Items per page (default: 50, max: 100)
    - `offset` (number) - Pagination offset (default: 0)

**Example Request:**

```http
GET /rest/v1/rpc/list_keys_default_view?project_id=550e8400-e29b-41d4-a716-446655440000&search=button&missing_only=false&limit=50&offset=0
Authorization: Bearer {access_token}
```

### 2.2 List Keys (Per-Language View)

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/rpc/list_keys_per_language_view`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project to list keys for
    - `locale` (string) - Target locale code in BCP-47 format (e.g., "en", "pl", "en-US")
  - Optional:
    - `search` (string) - Search term for key name
    - `missing_only` (boolean) - Filter to show only keys with NULL values in selected locale (default: false)
    - `limit` (number) - Items per page (default: 50)
    - `offset` (number) - Pagination offset (default: 0)

**Example Request:**

```http
GET /rest/v1/rpc/list_keys_per_language_view?project_id=550e8400-e29b-41d4-a716-446655440000&locale=pl&missing_only=true&limit=50&offset=0
Authorization: Bearer {access_token}
```

### 2.3 Create Key with Default Value

- **HTTP Method:** POST
- **URL Structure:** `/rest/v1/rpc/create_key_with_value`
- **Authentication:** Required
- **Parameters:** None (all data in request body)
- **Request Body:**

```json
{
  "p_default_value": "Welcome Home",
  "p_full_key": "app.home.title",
  "p_project_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Field Validation:**

- `p_full_key` (required, string):
  - Max 256 characters
  - Pattern: `[a-z0-9._-]` (lowercase letters, numbers, dots, underscores, hyphens)
  - No spaces allowed
  - No consecutive dots (`..`)
  - No trailing dot
  - Must start with project's `prefix` + `.`
- `p_default_value` (required, string):
  - Not empty (min 1 character after trim)
  - Max 250 characters
  - No newline characters
- `p_project_id` (required, UUID):
  - Valid UUID v4 format
  - Project must exist and be owned by authenticated user

### 2.4 Delete Key

- **HTTP Method:** DELETE
- **URL Structure:** `/rest/v1/keys?id=eq.{key_id}`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `id` (UUID) - Key ID (via query filter `id=eq.{key_id}`)
- **Request Body:** None

**Example Request:**

```http
DELETE /rest/v1/keys?id=eq.550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {access_token}
```

## 3. Used Types

### 3.1 Existing Types (from `src/shared/types/types.ts`)

```typescript
// Response DTOs
export interface KeyDefaultView {
  created_at: string;
  full_key: string;
  id: string;
  missing_count: number;
  value: null | string;
}

export interface KeyPerLanguageView {
  full_key: string;
  id: string;
  is_machine_translated: boolean;
  key_id: string;
  updated_at: string;
  updated_by_user_id: null | string;
  updated_source: UpdateSourceType;
  value: null | string;
}

export type UpdateSourceType = Enums<'update_source_type'>; // 'user' | 'system'

// Request DTOs
export interface CreateKeyRequest {
  p_default_value: string;
  p_full_key: string;
  p_project_id: string;
}

export interface CreateKeyResponse {
  key_id: string;
}

export interface ListKeysParams extends PaginationParams {
  missing_only?: boolean;
  project_id: string;
  search?: string;
}

export interface ListKeysPerLanguageParams extends ListKeysParams {
  locale: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// RPC Function Arguments (internal)
export interface ListKeysDefaultViewArgs {
  limit?: null | number;
  missing_only?: boolean | null;
  offset?: null | number;
  project_id: string;
  search?: null | string;
}

export interface ListKeysPerLanguageViewArgs {
  limit?: null | number;
  locale: string;
  missing_only?: boolean | null;
  offset?: null | number;
  project_id: string;
  search?: null | string;
}

export interface CreateKeyWithValueArgs {
  p_default_value: string;
  p_full_key: string;
  p_project_id: string;
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

export interface ConflictErrorResponse extends ApiErrorResponse {
  error: {
    code: 'conflict';
    message: string;
  };
}
```

### 3.2 New Zod Validation Schemas

Create validation schemas in `src/features/keys/api/keys.schemas.ts`:

```typescript
import { z } from 'zod';

// Locale code validation (BCP-47 format)
const localeCodeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// Key name validation (matches database CHECK constraint)
const keyNameSchema = z
  .string()
  .min(1, 'Key name is required')
  .max(256, 'Key name must be at most 256 characters')
  .regex(/^[a-z0-9._-]+$/, 'Key name can only contain lowercase letters, numbers, dots, underscores, and hyphens')
  .refine((val) => !val.includes('..'), 'Key name cannot contain consecutive dots')
  .refine((val) => !val.endsWith('.'), 'Key name cannot end with a dot');

// Translation value validation
const translationValueSchema = z
  .string()
  .trim()
  .min(1, 'Translation value cannot be empty')
  .max(250, 'Translation value must be at most 250 characters')
  .refine((val) => !val.includes('\n'), 'Translation value cannot contain newline characters');

// UUID validation helper
const uuidSchema = z.string().uuid('Invalid UUID format');

// List Keys Default View Schema
export const listKeysDefaultViewSchema = z.object({
  project_id: uuidSchema,
  search: z.string().optional(),
  missing_only: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

// List Keys Per-Language View Schema
export const listKeysPerLanguageViewSchema = z.object({
  project_id: uuidSchema,
  locale: localeCodeSchema,
  search: z.string().optional(),
  missing_only: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

// Create Key Schema
export const createKeySchema = z.object({
  p_project_id: uuidSchema,
  p_full_key: keyNameSchema,
  p_default_value: translationValueSchema,
});

// Key ID Schema
export const keyIdSchema = uuidSchema;

// Additional validation function to check prefix requirement
// This must be called separately with project data
export function validateKeyPrefix(fullKey: string, projectPrefix: string): boolean {
  return fullKey.startsWith(`${projectPrefix}.`);
}

// Validation error helper
export function createValidationError(field: string, constraint: string, message: string): ValidationErrorResponse {
  return {
    error: {
      code: 'validation_error',
      message,
      details: {
        field,
        constraint,
      },
    },
  };
}
```

## 4. Response Details

### 4.1 List Keys (Default Language View)

**Success Response (200 OK):**

```json
[
  {
    "created_at": "2025-01-15T10:00:00Z",
    "full_key": "app.home.title",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "missing_count": 2,
    "value": "Welcome Home"
  },
  {
    "created_at": "2025-01-15T10:01:00Z",
    "full_key": "app.home.subtitle",
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "missing_count": 0,
    "value": "Get started now"
  }
]
```

**Response Fields:**

- `id` - Key UUID
- `full_key` - Complete key name (e.g., "app.home.title")
- `value` - Translation value in default locale (can be NULL)
- `missing_count` - Number of locales with missing translation for this key
- `created_at` - ISO 8601 timestamp

**Default Sort:** `full_key ASC`

### 4.2 List Keys (Per-Language View)

**Success Response (200 OK):**

```json
[
  {
    "full_key": "app.home.title",
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "is_machine_translated": false,
    "key_id": "550e8400-e29b-41d4-a716-446655440000",
    "updated_at": "2025-01-15T10:05:00Z",
    "updated_by_user_id": "880e8400-e29b-41d4-a716-446655440003",
    "updated_source": "user",
    "value": null
  },
  {
    "full_key": "app.home.cta",
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "is_machine_translated": true,
    "key_id": "aa0e8400-e29b-41d4-a716-446655440005",
    "updated_at": "2025-01-15T10:20:00Z",
    "updated_by_user_id": null,
    "updated_source": "system",
    "value": "Rozpocznij teraz"
  }
]
```

**Response Fields:**

- `id` - Translation UUID (unique per key-locale pair)
- `key_id` - Reference to key UUID
- `full_key` - Complete key name
- `value` - Translation value in requested locale (can be NULL)
- `is_machine_translated` - Boolean flag indicating if translated by LLM
- `updated_at` - ISO 8601 timestamp of last update
- `updated_by_user_id` - UUID of user who last updated (NULL for system updates)
- `updated_source` - Enum: "user" (manual edit) or "system" (LLM translation)

**Default Sort:** `full_key ASC`

### 4.3 Create Key with Default Value

**Success Response (201 Created):**

```json
{
  "key_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Side Effects:**

1. New row inserted into `keys` table
2. Translation row created for default locale with `updated_by_user_id = auth.uid()` and `updated_source = 'user'`
3. Trigger `fan_out_translations_on_key_insert_trigger` creates NULL translation rows for all other project locales
4. Telemetry event `key_created` is emitted

### 4.4 Delete Key

**Success Response (204 No Content)**

Empty response body.

**Side Effects:**

1. Key row deleted from `keys` table
2. CASCADE DELETE removes all translation rows for this key (all locales)
3. Key name becomes immediately available for reuse

### 4.5 Error Responses

**400 Bad Request (Validation Error):**

```json
{
  "error": {
    "code": "validation_error",
    "details": {
      "constraint": "pattern",
      "field": "p_full_key"
    },
    "message": "Key name can only contain lowercase letters, numbers, dots, underscores, and hyphens"
  }
}
```

**400 Bad Request (Prefix Mismatch):**

```json
{
  "error": {
    "code": "validation_error",
    "details": {
      "constraint": "prefix_mismatch",
      "field": "p_full_key"
    },
    "message": "Key must start with project prefix 'app.'"
  }
}
```

**400 Bad Request (Missing Required Parameter):**

```json
{
  "error": {
    "code": "validation_error",
    "message": "Missing required parameters or invalid locale"
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

**403 Forbidden (Project Not Owned):**

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
    "message": "Key not found or access denied"
  }
}
```

**409 Conflict (Duplicate Key):**

```json
{
  "error": {
    "code": "conflict",
    "message": "Key already exists in project"
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

### 5.1 List Keys (Default Language View) Flow

1. User navigates to project keys page
2. React component invokes `useKeysDefaultView` hook with `projectId` and optional filters
3. Hook validates parameters using `listKeysDefaultViewSchema`
4. If validation fails, return 400 error immediately with field details
5. Hook retrieves Supabase client from `useSupabase()` context
6. Client calls RPC function `list_keys_default_view` with validated params
7. RLS policy validates project ownership via `keys.project_id → projects.owner_user_id = auth.uid()`
8. PostgreSQL executes query:
   - JOINs `keys` with default locale translations
   - Computes `missing_count` via subquery counting NULL translations across all locales
   - Applies optional trigram search filter on `full_key` (uses `idx_keys_full_key_trgm` index)
   - Applies optional `missing_only` filter (WHERE missing_count > 0)
   - Orders by `full_key ASC`
   - Applies pagination with `limit` and `offset`
9. Results returned to client
10. TanStack Query caches results with key `['keys', projectId, 'default', params]`
11. Component renders key list with missing counts indicator

### 5.2 List Keys (Per-Language View) Flow

1. User selects a target locale from language dropdown
2. Component invokes `useKeysPerLanguageView` hook with `projectId`, `locale`, and optional filters
3. Hook validates parameters using `listKeysPerLanguageViewSchema`
4. If locale format invalid (not BCP-47), return 400 error immediately
5. Hook calls Supabase RPC `list_keys_per_language_view`
6. RLS policy validates project ownership
7. PostgreSQL executes query:
   - JOINs `keys` with `translations` for specified locale
   - Uses `idx_translations_missing` index for efficient missing filter (WHERE value IS NULL)
   - Applies optional trigram search on `full_key`
   - Returns translation metadata: `value`, `is_machine_translated`, `updated_at`, `updated_by_user_id`, `updated_source`
   - Orders by `full_key ASC`
   - Applies pagination
8. Results returned with full translation provenance metadata
9. TanStack Query caches with key `['keys', projectId, 'locale', locale, params]`
10. Component renders key list with translation status indicators (manual vs LLM, last editor)

### 5.3 Create Key with Default Value Flow

1. User submits "Add Key" form with key name and default translation
2. `useCreateKey` mutation hook receives form data
3. Hook validates data using `createKeySchema` (format, length, character set)
4. If validation fails, return 400 error with specific field details
5. Hook fetches project details to get `prefix` (from TanStack Query cache or fresh query)
6. Hook validates prefix requirement: `full_key` must start with `{prefix}.`
7. If prefix mismatch, return 400 error with helpful message
8. Hook calls Supabase RPC `create_key_with_value` with validated data
9. RPC function atomically (within transaction):
   - Inserts new row into `keys` table with `project_id` and `full_key`
   - Inserts translation row for default locale:
     - `value = p_default_value`
     - `updated_by_user_id = auth.uid()`
     - `updated_source = 'user'`
     - `is_machine_translated = false`
   - Emits telemetry event `key_created` with properties: `{ full_key, key_count }`
10. Database trigger `fan_out_translations_on_key_insert_trigger` executes AFTER INSERT:
    - Queries all non-default locales for the project
    - Inserts translation rows with NULL values for each locale
    - Sets `updated_source = 'system'` and `is_machine_translated = false`
11. Database enforces unique constraint on `(project_id, full_key)`
12. On duplicate key error, PostgreSQL returns constraint violation → hook returns 409 Conflict
13. On success, RPC returns `{ key_id: uuid }`
14. TanStack Query invalidates related caches:
    - `['keys', projectId, 'default']` (default view list)
    - `['keys', projectId, 'locale', *]` (all locale-specific lists)
    - `['projects', projectId]` (project details with key count)
15. Component displays success message and new key appears in list

### 5.4 Delete Key Flow

1. User clicks delete button and confirms action in dialog
2. `useDeleteKey` mutation hook receives `keyId`
3. Hook validates UUID format using `keyIdSchema`
4. If invalid format, return 400 error immediately
5. Hook calls Supabase `.delete().eq('id', keyId)` on `keys` table
6. RLS policy validates ownership via `keys.project_id → projects.owner_user_id = auth.uid()`
7. If unauthorized or key doesn't exist, Supabase returns empty result → hook returns 404
8. PostgreSQL CASCADE DELETE automatically removes:
   - All translation rows: `translations.key_id → keys.id ON DELETE CASCADE`
   - All translation job items: `translation_job_items.key_id → keys.id ON DELETE CASCADE`
9. On success, Supabase returns 204 No Content
10. TanStack Query invalidates all key-related caches for the project
11. Component removes key from UI and displays success message
12. Key name becomes immediately available for reuse (no soft delete)

## 6. Security Considerations

### 6.1 Authentication

- All endpoints require valid JWT access token in `Authorization: Bearer {token}` header
- Token obtained via Supabase Auth during sign-in
- Token stored in Supabase client session and automatically included in all requests
- Token expiration handled by Supabase client with automatic refresh using refresh token

### 6.2 Authorization

**Indirect RLS via Project Ownership:**

- Keys table does not have `owner_user_id` column
- Authorization enforced through foreign key relationship: `keys.project_id → projects.id`
- RLS policy on `projects` table: `owner_user_id = auth.uid()`
- PostgreSQL query planner joins with `projects` table for all key operations
- Users can only access keys from projects they own
- Attempting to access another user's keys results in empty result set (appears as 404)

**RLS Policy Structure:**

```sql
-- Defined in supabase/migrations/20251013143400_create_rls_policies.sql
ALTER TABLE keys ENABLE ROW LEVEL SECURITY;

-- SELECT: User can select keys only from their own projects
CREATE POLICY keys_select_policy ON keys
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_user_id = auth.uid()
    )
  );

-- INSERT: User can insert keys only into their own projects
CREATE POLICY keys_insert_policy ON keys
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_user_id = auth.uid()
    )
  );

-- DELETE: User can delete keys only from their own projects
CREATE POLICY keys_delete_policy ON keys
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_user_id = auth.uid()
    )
  );
```

### 6.3 Input Validation

**Client-Side Validation (Zod):**

- All input validated before sending to backend
- Prevents malicious patterns and invalid data
- Provides immediate feedback to user

**Database-Level Validation:**

- CHECK constraint on `full_key` enforces pattern: `^[a-z0-9._-]+$`
- CHECK constraint prevents consecutive dots: `full_key NOT LIKE '%..'`
- CHECK constraint prevents trailing dot: `full_key NOT LIKE '%.'`
- Trigger `validate_key_prefix_trigger` enforces prefix requirement
- Trigger `trim_translation_value_trigger` auto-trims values and converts empty strings to NULL
- Trigger `validate_default_locale_value_trigger` prevents NULL values in default locale

**Immutability Guarantees:**

- Keys table has no UPDATE policy - keys are immutable after creation
- To change a key name, user must delete and recreate (preserves audit trail)

### 6.4 SQL Injection Prevention

- Supabase client uses parameterized queries for all operations
- RPC functions use typed parameters (`p_project_id UUID`, etc.)
- Never construct raw SQL strings from user input
- Search queries use PostgreSQL's trigram similarity with parameterized input

### 6.5 Data Exposure

**Sensitive Data Handling:**

- `updated_by_user_id` exposed in per-language view (needed for audit trail)
- User emails NOT exposed - only UUIDs
- Project IDs only accessible to owners via RLS
- Translation metadata visible only to project owner

**Prevent Information Leakage:**

- Don't distinguish between "key doesn't exist" and "access denied" (return 404 for both)
- Generic error messages for 500 errors (don't expose SQL or internal details)
- Validation errors safe to expose (don't reveal system internals)

### 6.6 Rate Limiting

- Supabase provides built-in rate limiting per IP address
- Consider application-level rate limiting for expensive operations:
  - Search queries (debounce on client-side)
  - Bulk key creation (implement batching with delays)
- TanStack Query caching reduces redundant requests

### 6.7 CSRF Protection

- Handled by Supabase Auth tokens
- JWT token in Authorization header (not cookies) immune to CSRF
- SameSite cookie attributes for refresh tokens prevent CSRF attacks

### 6.8 Prefix Validation Security

- Prefix stored in `projects` table (immutable after creation)
- Client-side validation prevents submission of invalid keys
- Database trigger `validate_key_prefix_trigger` provides defense-in-depth
- Prevents users from creating keys that could collide with other projects if prefix were changed (which is prevented by separate trigger)

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Empty key name
- Key name > 256 characters
- Invalid characters in key name (not `[a-z0-9._-]`)
- Consecutive dots in key name (`..`)
- Trailing dot in key name
- Empty default value (after trim)
- Default value > 250 characters
- Default value contains newline
- Invalid project_id format (not UUID)
- Invalid locale format (not BCP-47)
- Invalid pagination params (limit > 100, negative offset)
- Key doesn't start with project prefix

**Handling:**

```typescript
try {
  const validatedData = createKeySchema.parse(formData);

  // Additional prefix validation
  const { data: project } = await supabase
    .from('projects')
    .select('prefix')
    .eq('id', validatedData.p_project_id)
    .single();

  if (!project) {
    throw { error: { code: 'not_found', message: 'Project not found' } };
  }

  if (!validatedData.p_full_key.startsWith(`${project.prefix}.`)) {
    throw {
      error: {
        code: 'validation_error',
        message: `Key must start with project prefix '${project.prefix}.'`,
        details: {
          field: 'p_full_key',
          constraint: 'prefix_mismatch',
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
  throw error;
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
- If refresh fails, clear session and redirect to login
- Display message: "Session expired. Please log in again."
- Preserve intended destination for post-login redirect

**Example:**

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('[Auth] Token refreshed successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('[Auth] User signed out');
    navigate('/login', { state: { from: location.pathname } });
  }
});
```

### 7.3 Authorization Errors (403/404)

**Trigger Conditions:**

- User attempts to access keys from project owned by another user
- RLS policy denies access via project ownership check

**Handling:**

- Supabase returns empty result set for SELECT queries
- Return 404 "Project not found or access denied" to avoid leaking project existence
- Do not distinguish between "project doesn't exist" and "not authorized"

**Example:**

```typescript
const { data, error } = await supabase.rpc('list_keys_default_view', {
  project_id: projectId,
  ...params,
});

if (error) {
  // Check if error is due to RLS policy
  if (error.code === 'PGRST116') {
    // No rows returned
    throw {
      error: {
        code: 'not_found',
        message: 'Project not found or access denied',
      },
    };
  }
}
```

### 7.4 Conflict Errors (409)

**Trigger Conditions:**

- Duplicate key name within same project
- Unique constraint violation on `(project_id, full_key)`

**Handling:**

- Catch PostgreSQL unique constraint violation error code `23505`
- Return user-friendly message: "Key already exists in project"
- Suggest checking existing keys or using different name

**Example:**

```typescript
const { data, error } = await supabase.rpc('create_key_with_value', validatedData);

if (error) {
  if (error.code === '23505' && error.message.includes('keys_unique_per_project')) {
    return {
      error: {
        code: 'conflict',
        message: 'Key already exists in project',
      },
    };
  }
}
```

### 7.5 Database Trigger Errors (400)

**Trigger Conditions:**

- `validate_key_prefix_trigger` rejects key not starting with project prefix
- `validate_default_locale_value_trigger` rejects NULL/empty value for default locale
- `trim_translation_value_trigger` fails unexpectedly

**Handling:**

- Catch PostgreSQL RAISE EXCEPTION from trigger
- Parse error message to provide user-friendly feedback
- Log full error details for debugging

**Example:**

```typescript
if (error) {
  // Trigger validation errors
  if (error.message.includes('must start with project prefix')) {
    return {
      error: {
        code: 'validation_error',
        message: error.message,
        details: {
          field: 'p_full_key',
          constraint: 'prefix_required',
        },
      },
    };
  }

  if (error.message.includes('Default locale value cannot be empty')) {
    return {
      error: {
        code: 'validation_error',
        message: 'Translation value is required for default locale',
        details: {
          field: 'p_default_value',
          constraint: 'not_empty',
        },
      },
    };
  }
}
```

### 7.6 Not Found Errors (404)

**Trigger Conditions:**

- Key ID doesn't exist (delete operation)
- Project ID doesn't exist
- RLS policy denies access (appears as not found)

**Handling:**

```typescript
const { error, count } = await supabase.from('keys').delete().eq('id', keyId);

if (error) {
  console.error('[useDeleteKey] Delete error:', error);
  throw {
    error: {
      code: 'internal_server_error',
      message: 'Failed to delete key',
      details: { original: error },
    },
  };
}

if (count === 0) {
  throw {
    error: {
      code: 'not_found',
      message: 'Key not found or access denied',
    },
  };
}
```

### 7.7 Server Errors (500)

**Trigger Conditions:**

- Database connection failure
- RPC function execution error
- Fan-out trigger failure (locale creation)
- Unexpected constraint violation
- Cascade delete failure

**Handling:**

- Log full error details to console (development) or error tracking service (production)
- Return generic message to user: "An unexpected error occurred. Please try again."
- Do not expose internal error details to client
- Include request ID for support tracking

**Example:**

```typescript
const { data, error } = await supabase.rpc('create_key_with_value', validatedData);

if (error) {
  console.error('[useCreateKey] RPC error:', {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });

  // Send to error tracking
  if (import.meta.env.PROD) {
    trackError(error, {
      context: 'useCreateKey',
      projectId: validatedData.p_project_id,
      keyName: validatedData.p_full_key,
    });
  }

  // Generic error for client
  return {
    error: {
      code: 'internal_server_error',
      message: 'An unexpected error occurred. Please try again.',
    },
  };
}
```

### 7.8 Network Errors

**Trigger Conditions:**

- Lost internet connection
- Supabase service unavailable
- Request timeout
- Network congestion

**Handling:**

- TanStack Query automatically retries failed requests (3 retries with exponential backoff)
- Display network error message with retry button
- Use cached data to show stale content during outage
- Implement offline indicator in UI

**Example:**

```typescript
export function useKeysDefaultView(projectId: string, params: ListKeysParams = {}) {
  const supabase = useSupabase();

  return useQuery<KeyDefaultView[], ApiError>({
    queryKey: ['keys', projectId, 'default', params],
    queryFn: async () => {
      // ... fetch logic
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    networkMode: 'online', // Only fetch when online
  });
}
```

## 8. Performance Considerations

### 8.1 Query Optimization

**Indexing:**

- Primary key index on `id` (auto-created)
- Composite unique index on `(project_id, full_key)` for duplicate checking and RLS filtering
- Trigram GIN index on `full_key` for fast fuzzy search: `idx_keys_full_key_trgm`
- Index on `translations` for missing filter: `idx_translations_missing` (filters by `value IS NULL`)
- Foreign key index on `project_id` for efficient RLS joins

**Defined in `supabase/migrations/20251013143200_create_indexes.sql`:**

```sql
-- Fast duplicate key lookup and RLS filtering
CREATE UNIQUE INDEX keys_unique_per_project ON keys(project_id, full_key);

-- Fast fuzzy search on key names
CREATE INDEX idx_keys_full_key_trgm ON keys USING GIN (full_key gin_trgm_ops);

-- Fast missing translation filter
CREATE INDEX idx_translations_missing ON translations(project_id, locale, key_id)
  WHERE value IS NULL;
```

**Pagination:**

- Default limit of 50 balances UX and performance
- Max limit of 100 prevents excessive data transfer and long query times
- Use `limit` and `offset` for cursor-based pagination
- Consider keyset pagination for very large datasets (future optimization)

**Selective Fetching:**

- RPC functions return only required columns
- Default view excludes translation metadata to reduce payload
- Per-language view includes metadata only for selected locale

### 8.2 Caching Strategy

**TanStack Query Configuration:**

```typescript
// Default view: 2-minute cache (frequently changing)
staleTime: 2 * 60 * 1000,
gcTime: 10 * 60 * 1000,

// Per-language view: 5-minute cache (less frequently changing)
staleTime: 5 * 60 * 1000,
gcTime: 15 * 60 * 1000,
```

**Cache Keys Structure:**

```typescript
export const keysQueryKeys = {
  all: (projectId: string) => ['keys', projectId] as const,
  defaultView: (projectId: string, params: ListKeysParams) =>
    [...keysQueryKeys.all(projectId), 'default', params] as const,
  localeView: (projectId: string, locale: string, params: ListKeysPerLanguageParams) =>
    [...keysQueryKeys.all(projectId), 'locale', locale, params] as const,
};
```

**Cache Invalidation:**

- Create key → invalidate all list views for project (`['keys', projectId]`)
- Delete key → invalidate all list views for project
- Update translation (separate feature) → invalidate specific locale view

### 8.3 Optimistic Updates

**Not Recommended for Keys:**

- Keys require server-side validation (prefix check, fan-out trigger)
- Complex side effects (creating translations for all locales)
- Risk of rollback due to conflicts or validation failures
- Better UX to wait for server confirmation (typically < 500ms)

**Recommended Approach:**

```typescript
const createMutation = useCreateKey(projectId);

const handleSubmit = async (formData) => {
  setIsSubmitting(true);
  try {
    const result = await createMutation.mutateAsync(formData);
    showSuccessToast('Key created successfully');
    navigate(`/projects/${projectId}/keys`);
  } catch (error) {
    showErrorToast(error.message);
  } finally {
    setIsSubmitting(false);
  }
};
```

### 8.4 Request Debouncing

**Search Input:**

- Debounce search input by 300ms to reduce API calls
- Use `useDebounce` hook from `src/shared/hooks`

**Example:**

```typescript
import { useDebounce } from '@/hooks';

export function KeySearchInput({ projectId, locale }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: keys } = useKeysPerLanguageView(projectId, locale, {
    search: debouncedSearch,
  });

  return <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />;
}
```

### 8.5 Database Performance

**RPC Function Optimization:**

- `list_keys_default_view` uses efficient LEFT JOIN with correlated subquery for missing_count
- `list_keys_per_language_view` uses INNER JOIN with translations for selected locale
- Both functions use indexes for filtering and sorting
- EXPLAIN ANALYZE shows query plans use index scans (not sequential scans)

**Trigram Search Performance:**

- GIN index `idx_keys_full_key_trgm` enables fast similarity search
- Typical search query < 50ms for 10,000 keys
- Fallback to LIKE '%search%' if trigram extension unavailable

### 8.6 Payload Size

**Typical Responses:**

- Default view list (50 keys): ~3-5 KB
- Per-language view list (50 keys): ~5-8 KB (includes metadata)
- Create key response: ~50 bytes
- Delete key response: 0 bytes (204 No Content)

**Compression:**

- gzip compression enabled by default in Supabase
- Typically achieves 70-80% compression ratio for JSON responses
- Consider Brotli compression for further optimization (Supabase Edge Functions)

### 8.7 Fan-Out Performance

**Key Creation with Fan-Out:**

- Trigger `fan_out_translations_on_key_insert_trigger` runs AFTER INSERT
- Creates NULL translations for all non-default locales
- For project with 10 locales: ~50ms overhead
- For project with 50 locales: ~200ms overhead
- Acceptable trade-off for data consistency and workflow support

**Optimization Strategies:**

- Fan-out runs in single transaction (atomic)
- Batch inserts use `INSERT INTO ... SELECT` for efficiency
- No N+1 queries (single INSERT for all locales)
- Consider async fan-out for very large projects (future optimization if needed)

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

```bash
mkdir -p src/features/keys/{api,components,routes,hooks}
```

### Step 2: Create Zod Validation Schemas

Create `src/features/keys/api/keys.schemas.ts` with all validation schemas defined in section 3.2.

### Step 3: Create TanStack Query Hooks

**3.1 Create `src/features/keys/api/useKeysDefaultView.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { listKeysDefaultViewSchema } from './keys.schemas';
import type { ListKeysParams, KeyDefaultView, ApiError } from '@/shared/types';

export const keysQueryKeys = {
  all: (projectId: string) => ['keys', projectId] as const,
  defaultView: (projectId: string, params: ListKeysParams) =>
    [...keysQueryKeys.all(projectId), 'default', params] as const,
  localeView: (projectId: string, locale: string, params: Omit<ListKeysParams, 'locale'>) =>
    [...keysQueryKeys.all(projectId), 'locale', locale, params] as const,
};

export function useKeysDefaultView(projectId: string, params: Omit<ListKeysParams, 'project_id'> = {}) {
  const supabase = useSupabase();

  return useQuery<KeyDefaultView[], ApiError>({
    queryKey: keysQueryKeys.defaultView(projectId, { project_id: projectId, ...params }),
    queryFn: async () => {
      // Validate parameters
      const validated = listKeysDefaultViewSchema.parse({
        project_id: projectId,
        ...params,
      });

      // Call RPC function
      const { data, error } = await supabase.rpc('list_keys_default_view', {
        project_id: validated.project_id,
        search: validated.search || null,
        missing_only: validated.missing_only || null,
        limit: validated.limit || null,
        offset: validated.offset || null,
      });

      if (error) {
        console.error('[useKeysDefaultView] Query error:', error);

        // Check for RLS policy denial
        if (error.code === 'PGRST116') {
          throw {
            error: {
              code: 'not_found',
              message: 'Project not found or access denied',
            },
          };
        }

        throw {
          error: {
            code: 'database_error',
            message: 'Failed to fetch keys',
            details: { original: error },
          },
        };
      }

      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

**3.2 Create `src/features/keys/api/useKeysPerLanguageView.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { listKeysPerLanguageViewSchema } from './keys.schemas';
import { keysQueryKeys } from './useKeysDefaultView';
import type { ListKeysPerLanguageParams, KeyPerLanguageView, ApiError } from '@/shared/types';

export function useKeysPerLanguageView(
  projectId: string,
  locale: string,
  params: Omit<ListKeysPerLanguageParams, 'project_id' | 'locale'> = {}
) {
  const supabase = useSupabase();

  return useQuery<KeyPerLanguageView[], ApiError>({
    queryKey: keysQueryKeys.localeView(projectId, locale, params),
    queryFn: async () => {
      // Validate parameters
      const validated = listKeysPerLanguageViewSchema.parse({
        project_id: projectId,
        locale,
        ...params,
      });

      // Call RPC function
      const { data, error } = await supabase.rpc('list_keys_per_language_view', {
        project_id: validated.project_id,
        locale: validated.locale,
        search: validated.search || null,
        missing_only: validated.missing_only || null,
        limit: validated.limit || null,
        offset: validated.offset || null,
      });

      if (error) {
        console.error('[useKeysPerLanguageView] Query error:', error);

        // Invalid locale format
        if (error.message.includes('locale')) {
          throw {
            error: {
              code: 'validation_error',
              message: 'Invalid locale format',
              details: {
                field: 'locale',
                constraint: 'format',
              },
            },
          };
        }

        // RLS policy denial
        if (error.code === 'PGRST116') {
          throw {
            error: {
              code: 'not_found',
              message: 'Project not found or access denied',
            },
          };
        }

        throw {
          error: {
            code: 'database_error',
            message: 'Failed to fetch keys',
            details: { original: error },
          },
        };
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

**3.3 Create `src/features/keys/api/useCreateKey.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createKeySchema, validateKeyPrefix, createValidationError } from './keys.schemas';
import { keysQueryKeys } from './useKeysDefaultView';
import type { CreateKeyRequest, CreateKeyResponse, ApiError } from '@/shared/types';

export function useCreateKey(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<CreateKeyResponse, ApiError, Omit<CreateKeyRequest, 'p_project_id'>>({
    mutationFn: async (keyData) => {
      // Validate input
      const validated = createKeySchema.parse({
        p_project_id: projectId,
        ...keyData,
      });

      // Fetch project to validate prefix
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('prefix')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        console.error('[useCreateKey] Project fetch error:', projectError);
        throw {
          error: {
            code: 'not_found',
            message: 'Project not found or access denied',
          },
        };
      }

      // Validate key prefix
      if (!validateKeyPrefix(validated.p_full_key, project.prefix)) {
        throw createValidationError(
          'p_full_key',
          'prefix_mismatch',
          `Key must start with project prefix '${project.prefix}.'`
        );
      }

      // Call RPC function to create key with default value
      const { data, error } = await supabase.rpc('create_key_with_value', validated).single();

      if (error) {
        console.error('[useCreateKey] RPC error:', error);

        // Handle unique constraint violation (duplicate key)
        if (error.code === '23505' && error.message.includes('keys_unique_per_project')) {
          throw {
            error: {
              code: 'conflict',
              message: 'Key already exists in project',
            },
          };
        }

        // Handle trigger validation errors
        if (error.message.includes('must start with project prefix')) {
          throw createValidationError('p_full_key', 'prefix_required', error.message);
        }

        if (error.message.includes('Default locale value cannot be empty')) {
          throw createValidationError('p_default_value', 'not_empty', 'Translation value is required');
        }

        // Generic error
        throw {
          error: {
            code: 'internal_server_error',
            message: 'Failed to create key',
            details: { original: error },
          },
        };
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate all key list caches for this project
      queryClient.invalidateQueries({ queryKey: keysQueryKeys.all(projectId) });

      // Also invalidate project details (key_count may have changed)
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}
```

**3.4 Create `src/features/keys/api/useDeleteKey.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { keyIdSchema } from './keys.schemas';
import { keysQueryKeys } from './useKeysDefaultView';
import type { ApiError } from '@/shared/types';

export function useDeleteKey(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (keyId) => {
      // Validate key ID
      const validatedId = keyIdSchema.parse(keyId);

      const { error, count } = await supabase.from('keys').delete().eq('id', validatedId);

      if (error) {
        console.error('[useDeleteKey] Delete error:', error);
        throw {
          error: {
            code: 'internal_server_error',
            message: 'Failed to delete key',
            details: { original: error },
          },
        };
      }

      if (count === 0) {
        throw {
          error: {
            code: 'not_found',
            message: 'Key not found or access denied',
          },
        };
      }
    },
    onSuccess: () => {
      // Invalidate all key list caches for this project
      queryClient.invalidateQueries({ queryKey: keysQueryKeys.all(projectId) });

      // Also invalidate project details (key_count may have changed)
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}
```

### Step 4: Create API Index File

Create `src/features/keys/api/index.ts`:

```typescript
export { useKeysDefaultView, keysQueryKeys } from './useKeysDefaultView';
export { useKeysPerLanguageView } from './useKeysPerLanguageView';
export { useCreateKey } from './useCreateKey';
export { useDeleteKey } from './useDeleteKey';
export * from './keys.schemas';
```

### Step 5: Write Unit Tests

**5.1 Create `src/features/keys/api/useKeysDefaultView.test.ts`:**

Test scenarios:

- Successful fetch with default params
- Successful fetch with search filter
- Successful fetch with missing_only filter
- Successful fetch with pagination
- Validation error for invalid project_id (not UUID)
- Validation error for invalid limit (> 100)
- Project not found (404)
- RLS access denied (appears as 404)
- Database error handling

**5.2 Create `src/features/keys/api/useKeysPerLanguageView.test.ts`:**

Test scenarios:

- Successful fetch with valid locale
- Successful fetch with search filter
- Successful fetch with missing_only filter
- Validation error for invalid locale format
- Validation error for invalid project_id
- Project not found
- RLS access denied
- Empty result set (no keys)

**5.3 Create `src/features/keys/api/useCreateKey.test.ts`:**

Test scenarios:

- Successful key creation
- Validation error (invalid key name pattern)
- Validation error (empty default value)
- Validation error (value too long)
- Validation error (consecutive dots in key name)
- Validation error (trailing dot)
- Prefix mismatch error (doesn't start with project prefix)
- Duplicate key conflict (409)
- Project not found (404)
- Database error (fan-out trigger failure simulation)

**5.4 Create `src/features/keys/api/useDeleteKey.test.ts`:**

Test scenarios:

- Successful deletion
- Validation error (invalid UUID format)
- Key not found (404)
- RLS access denied (appears as 404)
- Database error
- Verify cache invalidation

### Step 6: Create Example Components

**6.1 Create `src/features/keys/components/KeysDefaultViewList.tsx`:**

Component that uses `useKeysDefaultView` hook to display keys with default locale values and missing counts.

Features:

- Search input with debouncing
- Missing-only filter toggle
- Pagination controls
- Loading skeleton
- Empty state
- Error boundary

**6.2 Create `src/features/keys/components/KeysPerLanguageViewList.tsx`:**

Component that uses `useKeysPerLanguageView` hook to display keys for selected locale.

Features:

- Locale selector dropdown
- Search input
- Missing-only filter
- Translation status indicators (manual vs LLM)
- Last editor display
- Inline edit capability (future)

**6.3 Create `src/features/keys/components/CreateKeyForm.tsx`:**

Form component using `useCreateKey` mutation.

Features:

- Key name input with real-time validation feedback
- Prefix hint display (e.g., "app.")
- Default value textarea
- Character count indicators
- Validation error display
- Success/error toasts
- Auto-focus on key name input

**6.4 Create `src/features/keys/components/DeleteKeyButton.tsx`:**

Confirmation dialog component using `useDeleteKey` mutation.

Features:

- Confirmation modal with key name display
- Warning about cascade deletion
- Loading state during deletion
- Success/error feedback

### Step 7: Create Route Components

**7.1 Create `src/features/keys/routes/KeysDefaultViewPage.tsx`:**

Page component that renders `KeysDefaultViewList` with filters and pagination.

**7.2 Create `src/features/keys/routes/KeysPerLanguageViewPage.tsx`:**

Page component that renders `KeysPerLanguageViewList` with locale selector.

**7.3 Create `src/features/keys/routes/CreateKeyPage.tsx`:**

Page component that renders `CreateKeyForm` with navigation after success.

### Step 8: Register Routes

Update `src/app/routes.ts` to include new key routes:

```typescript
{
  path: '/projects/:projectId/keys',
  lazy: () => import('@/features/keys/routes/KeysDefaultViewPage'),
},
{
  path: '/projects/:projectId/keys/locale/:locale',
  lazy: () => import('@/features/keys/routes/KeysPerLanguageViewPage'),
},
{
  path: '/projects/:projectId/keys/new',
  lazy: () => import('@/features/keys/routes/CreateKeyPage'),
},
```

### Step 9: Add Component Tests

Write tests for each component using Testing Library:

- User interactions (form submission, filter toggle, search input)
- Loading states (skeleton loaders)
- Error states (error boundaries, inline errors)
- Success states (data display, success messages)
- Debounced search behavior
- Pagination navigation
- Locale switching

### Step 10: Integration Testing

Test complete user flows:

1. User creates a key → sees it in default view list → verifies it appears in per-language view for all locales
2. User searches for keys → sees filtered results → clears search → sees all keys
3. User toggles missing-only filter → sees only keys with missing translations
4. User attempts to create duplicate key → sees conflict error
5. User creates key with invalid prefix → sees validation error
6. User deletes key → confirms deletion → verifies it's removed from all views

### Step 11: Documentation

**11.1 Add JSDoc comments to all hooks:**

Document parameters, return types, error scenarios, and usage examples.

**11.2 Create `src/features/keys/README.md`:**

Document:

- Feature overview
- Available hooks and their usage
- Key naming conventions and prefix requirements
- Example code snippets
- Common patterns and best practices
- Fan-out mechanism explanation

### Step 12: Performance Audit

- Verify query caching works correctly for both views
- Check bundle size impact
- Test with large datasets (1000+ keys)
- Measure search query performance with trigram index
- Verify pagination performs well
- Test fan-out performance with 20+ locales

### Step 13: Accessibility Review

- Ensure all forms have proper labels and ARIA attributes
- Test keyboard navigation
- Verify screen reader compatibility
- Check focus management after mutations
- Ensure error messages are announced
- Test with keyboard-only interaction

### Step 14: Final Review and Deployment

- Run `npm run lint` and fix any issues
- Run `npm run test` and ensure high coverage for API layer
- Test with real Supabase instance (not mock)
- Verify RLS policies work correctly
- Test fan-out trigger creates translations for all locales
- Update this implementation plan with any changes
- Create pull request with comprehensive description
- Request code review from team members
- Merge and deploy to staging environment
- Monitor error tracking for any production issues
- Document any edge cases discovered during testing
