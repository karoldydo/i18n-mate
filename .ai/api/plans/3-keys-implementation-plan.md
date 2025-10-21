# API Endpoint Implementation Plan: Keys

## 1. Endpoint Overview

The Keys API provides operations for managing translation keys within projects. Each key is created in the default language and automatically mirrored to all locales. The API consists of four endpoints that handle listing (in two views), creation, and deletion of keys with proper authentication, authorization via RLS policies, and comprehensive validation.

### Key Features

- Two distinct list views: default language view with missing counts, and per-language view with translation metadata
- Efficient search using trigram indexes
- Optional filtering by missing translations
- Atomic key creation with automatic fan-out to all locales via triggers
- Cascading deletion of all translations
- Strict validation of key format and prefix requirements
- **Centralized constants and validation patterns** for consistency between TypeScript and PostgreSQL constraints

### Endpoints Summary

1. **List Keys (Default View)** - `GET /rest/v1/rpc/list_keys_default_view`
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
    - `project_id` (UUID) - Project UUID
  - Optional:
    - `search` (string) - Search term for key name (case-insensitive contains)
    - `missing_only` (boolean) - Filter keys with missing translations
    - `limit` (number) - Items per page (default: 50, max: 100)
    - `offset` (number) - Pagination offset (default: 0)
- **Request Body:** None

**Example Request:**

```http
GET /rest/v1/rpc/list_keys_default_view?project_id=550e8400-e29b-41d4-a716-446655440000&search=button&missing_only=false&limit=50&offset=0
Authorization: Bearer {access_token}
```

Note: Raw RPC returns an array of rows and uses p\_-prefixed parameter names (e.g., p_project_id, p_limit). Client hooks map UI params to RPC params and wrap the result into `{ data, metadata }` using Supabase's exact count and pagination params.

### 2.2 List Keys (Per-Language View)

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/rpc/list_keys_per_language_view`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project UUID
    - `locale` (string) - Target locale code (BCP-47 format)
  - Optional:
    - `search` (string) - Search term for key name
    - `missing_only` (boolean) - Filter keys with NULL values in selected locale
    - `limit` (number) - Items per page (default: 50)
    - `offset` (number) - Pagination offset (default: 0)
- **Request Body:** None

**Example Request:**

```http
GET /rest/v1/rpc/list_keys_per_language_view?project_id=550e8400-e29b-41d4-a716-446655440000&locale=pl&missing_only=true&limit=50&offset=0
Authorization: Bearer {access_token}
```

Note: Raw RPC returns an array of rows and uses p\_-prefixed parameter names (e.g., p_project_id, p_locale, p_limit). Client hooks map UI params to RPC params and wrap the result into `{ data, metadata }` using Supabase's exact count and pagination params.

### 2.3 Create Key with Default Value

- **HTTP Method:** POST
- **URL Structure:** `/rest/v1/rpc/create_key_with_value`
- **Authentication:** Required
- **Parameters:** None
- **Request Body:**

```json
{
  "p_default_value": "Welcome Home",
  "p_full_key": "app.home.title",
  "p_project_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Field Validation:**

- `p_full_key` (required, string) - Max 256 chars, pattern `^[a-z0-9._-]+$`, no `..`, no trailing dot, must start with project prefix + "."
- `p_default_value` (required, string) - Max 250 chars, no newline, auto-trimmed, cannot be empty
- `p_project_id` (required, UUID) - Project UUID

**Response Format:**

The RPC function returns `TABLE(key_id uuid)`, which PostgREST wraps in an array. The client hook uses `.single()` to extract the single object.

### 2.4 Delete Key

- **HTTP Method:** DELETE
- **URL Structure:** `/rest/v1/keys?id=eq.{key_id}`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `id` (UUID) - Key ID (via query filter)
- **Request Body:** None

**Response Format:**

The mutation returns `void` (no content). The underlying Supabase API returns `{ count, error }`, but the hook normalizes this to return `void`, matching REST conventions for 204 No Content.

## 3. Used Types

### 3.1 Response DTOs

Create in `src/shared/types/types.ts`:

```typescript
// List Keys Default View Response
export interface KeyDefaultViewResponse {
  created_at: string;
  full_key: string;
  id: string;
  missing_count: number;
  value: string;
}

export interface KeyDefaultViewListResponse {
  data: KeyDefaultViewResponse[];
  metadata: PaginationMetadata;
}

// List Keys Per-Language View Response
export interface KeyPerLanguageViewResponse {
  full_key: string;
  is_machine_translated: boolean;
  key_id: string;
  updated_at: string;
  updated_by_user_id: string | null;
  updated_source: string;
  value: string | null;
}

export interface KeyPerLanguageViewListResponse {
  data: KeyPerLanguageViewResponse[];
  metadata: PaginationMetadata;
}

// Create Key Response
export interface CreateKeyResponse {
  key_id: string;
}

// Request DTOs
export interface CreateKeyRequest {
  default_value: string;
  full_key: string;
  project_id: string;
}

export interface ListKeysDefaultViewParams extends PaginationParams {
  missing_only?: boolean; // Default: false, undefined treated as false
  project_id: string;
  search?: string; // If omitted/empty, no search filter applied
}

export interface ListKeysPerLanguageParams extends ListKeysDefaultViewParams {
  locale: string; // Required BCP-47 locale code
}
```

### 3.2 Zod Validation Schemas

Create validation schemas in `src/features/keys/api/keys.schemas.ts`:

**Note:** The implementation now uses constants from `src/shared/constants/keys.constants.ts` for validation parameters, error messages, and patterns. This ensures consistency between client-side validation and database constraints.

```typescript
import { z } from 'zod';

import {
  KEY_FORMAT_PATTERN,
  KEY_NAME_MAX_LENGTH,
  KEY_NAME_MIN_LENGTH,
  KEYS_DEFAULT_LIMIT,
  KEYS_MAX_LIMIT,
  KEYS_MIN_OFFSET,
  TRANSLATION_VALUE_MAX_LENGTH,
  TRANSLATION_VALUE_MIN_LENGTH,
  KEYS_ERROR_MESSAGES,
} from '@/shared/constants';

// full key validation
const FULL_KEY_SCHEMA = z
  .string()
  .min(KEY_NAME_MIN_LENGTH, KEYS_ERROR_MESSAGES.KEY_REQUIRED)
  .max(KEY_NAME_MAX_LENGTH, KEYS_ERROR_MESSAGES.KEY_TOO_LONG)
  .regex(KEY_FORMAT_PATTERN, KEYS_ERROR_MESSAGES.KEY_INVALID_FORMAT)
  .refine((value) => !value.includes('..'), KEYS_ERROR_MESSAGES.KEY_CONSECUTIVE_DOTS)
  .refine((value) => !value.endsWith('.'), KEYS_ERROR_MESSAGES.KEY_TRAILING_DOT);

// translation value validation
const TRANSLATION_VALUE_SCHEMA = z
  .string()
  .min(TRANSLATION_VALUE_MIN_LENGTH, KEYS_ERROR_MESSAGES.VALUE_REQUIRED)
  .max(TRANSLATION_VALUE_MAX_LENGTH, KEYS_ERROR_MESSAGES.VALUE_TOO_LONG)
  .refine((value) => !value.includes('\n'), KEYS_ERROR_MESSAGES.VALUE_NO_NEWLINES)
  .transform((value) => value.trim());

// locale code validation (BCP-47 format)
const LOCALE_CODE_SCHEMA = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// project id validation
export const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

// list keys default view schema
export const LIST_KEYS_DEFAULT_VIEW_SCHEMA = z.object({
  limit: z.number().int().min(1).max(KEYS_MAX_LIMIT).optional().default(KEYS_DEFAULT_LIMIT),
  missing_only: z.boolean().optional().default(KEYS_DEFAULT_PARAMS.MISSING_ONLY),
  offset: z.number().int().min(KEYS_MIN_OFFSET).optional().default(KEYS_DEFAULT_PARAMS.OFFSET),
  project_id: UUID_SCHEMA,
  search: z.string().optional(),
});

// list keys per-language view schema
export const LIST_KEYS_PER_LANGUAGE_VIEW_SCHEMA = LIST_KEYS_DEFAULT_VIEW_SCHEMA.extend({
  locale: LOCALE_CODE_SCHEMA,
});

// create key request schema (api input format without p_ prefix)
export const CREATE_KEY_REQUEST_SCHEMA = z.object({
  default_value: TRANSLATION_VALUE_SCHEMA,
  full_key: FULL_KEY_SCHEMA,
  project_id: UUID_SCHEMA,
});

// create key schema with rpc parameter transformation (adds p_ prefix)
export const CREATE_KEY_SCHEMA = CREATE_KEY_REQUEST_SCHEMA.transform((data) => ({
  p_default_value: data.default_value,
  p_full_key: data.full_key,
  p_project_id: data.project_id,
}));

// response schemas for runtime validation
export const KEY_DEFAULT_VIEW_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  full_key: z.string(),
  id: z.string().uuid(),
  missing_count: z.number().int().min(0),
  value: z.string(),
});

// key per-language view response schema
export const KEY_PER_LANGUAGE_VIEW_RESPONSE_SCHEMA = z.object({
  full_key: z.string(),
  is_machine_translated: z.boolean(),
  key_id: z.string().uuid(),
  updated_at: z.string(),
  updated_by_user_id: z.string().uuid().nullable(),
  updated_source: z.enum(['user', 'system']),
  value: z.string().nullable(),
});

// create key response schema
export const CREATE_KEY_RESPONSE_SCHEMA = z.object({
  key_id: z.string().uuid(),
});
```

## 4. Response Details

### 4.1 List Keys (Default Language View)

**Success Response (200 OK):**

**Response Format Guidelines:**

- **List format**: List endpoints always return `{ data: [], metadata: {} }` wrapper format
- Raw RPC returns an array of rows, client hooks wrap this into structured response
- Metadata includes pagination info: `start`, `end`, `total` (from Supabase count)
- Use this format for paginated results with search/filter capabilities

```json
{
  "data": [
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
  ],
  "metadata": {
    "end": 1,
    "start": 0,
    "total": 2
  }
}
```

### 4.2 List Keys (Per-Language View)

**Success Response (200 OK):**

Same list format as default view - includes translation metadata for specified locale:

```json
{
  "data": [
    {
      "full_key": "app.home.title",
      "is_machine_translated": false,
      "key_id": "550e8400-e29b-41d4-a716-446655440000",
      "updated_at": "2025-01-15T10:05:00Z",
      "updated_by_user_id": null,
      "updated_source": "user",
      "value": null
    },
    {
      "full_key": "app.home.cta",
      "is_machine_translated": true,
      "key_id": "660e8400-e29b-41d4-a716-446655440001",
      "updated_at": "2025-01-15T10:20:00Z",
      "updated_by_user_id": null,
      "updated_source": "system",
      "value": "Rozpocznij teraz"
    }
  ],
  "metadata": {
    "end": 1,
    "start": 0,
    "total": 2
  }
}
```

### 4.3 Create Key with Default Value

**Success Response (200 OK):**

**Response Format Guidelines:**

- **RPC Function Response**: PostgREST wraps RPC results in arrays by default
- **Client Hook Response**: Uses `.single()` to extract single object for consistency
- Creation endpoints return structured data, not the full entity (only key_id for reference)

**Raw RPC Response:**
PostgREST wraps the result in an array:

```json
[
  {
    "key_id": "550e8400-e29b-41d4-a716-446655440000"
  }
]
```

**Hook Response:**
The client hook uses `.single()` to extract the first element:

```json
{
  "key_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 4.4 Delete Key

**Success Response (Mutation Returns void)**

The mutation hook returns `void` (no content), equivalent to 204 No Content semantics.

**Implementation Note:**

The underlying Supabase API returns:

```json
{
  "count": 1,
  "error": null,
  "status": 200
}
```

The hook normalizes this by checking `count > 0` and returning `void` to match REST conventions for successful deletion with no response body.

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
      "field": "p_full_key"
    },
    "message": "Key can only contain lowercase letters, numbers, dots, underscores, and hyphens"
  }
}
```

**400 Bad Request (Missing Required Parameter):**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "details": {
      "constraint": "required",
      "field": "locale"
    },
    "message": "Locale parameter is required"
  }
}
```

**403 Forbidden:**

```json
{
  "data": null,
  "error": {
    "code": 403,
    "message": "Project not owned by user"
  }
}
```

**404 Not Found:**

```json
{
  "data": null,
  "error": {
    "code": 404,
    "message": "Key not found or access denied"
  }
}
```

**409 Conflict:**

```json
{
  "data": null,
  "error": {
    "code": 409,
    "message": "Key already exists in project"
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

### 5.1 List Keys (Default View) Flow

1. User requests key list for project via React component
2. TanStack Query hook (`useKeysDefaultView`) is invoked with project ID and optional params
3. Hook validates params using `LIST_KEYS_DEFAULT_VIEW_SCHEMA`
4. Hook retrieves Supabase client from `useSupabase()` context
5. Client calls RPC function `list_keys_default_view` with validated params
6. RPC function performs authorization check via RLS policy on projects table
7. If unauthorized, PostgreSQL returns empty result → hook throws 403 error
8. PostgreSQL executes query with:
   - Trigram index `idx_keys_full_key_trgm` for search performance
   - Subquery counting NULL translations for `missing_count`
   - Optional filter by `missing_only`
   - Sort by `full_key ASC`
9. Results are returned with exact count from Supabase
10. Hook constructs response with data array and pagination metadata
11. TanStack Query caches results
12. Component renders key list with missing counts and pagination controls

### 5.2 List Keys (Per-Language View) Flow

1. User selects a locale and requests key list via React component
2. TanStack Query hook (`useKeysPerLanguageView`) is invoked with project ID, locale, and optional params
3. Hook validates params using `LIST_KEYS_PER_LANGUAGE_VIEW_SCHEMA` (includes locale validation)
4. Hook retrieves Supabase client from `useSupabase()` context
5. Client calls RPC function `list_keys_per_language_view` with validated params
6. RPC function performs authorization check via RLS policy
7. If locale doesn't exist in project, PostgreSQL returns empty result
8. PostgreSQL executes query with:
   - JOIN between `keys` and `translations` tables
   - Index `idx_translations_missing` for efficient missing filter
   - Metadata fields: `is_machine_translated`, `updated_by_user_id`, `updated_source`
   - Optional filter by `missing_only` (WHERE `value` IS NULL)
9. Results are returned with exact count
10. Hook constructs response with data array and metadata
11. TanStack Query caches results per locale
12. Component renders key list with translation values and metadata

### 5.3 Create Key Flow

1. User submits key creation form with full_key and default_value
2. `useCreateKey` mutation hook receives form data
3. Hook validates data using `CREATE_KEY_SCHEMA`
4. If validation fails, return 400 error immediately
5. Hook calls Supabase RPC `create_key_with_value` with validated data
6. RPC function atomically:
   - Validates key prefix matches project prefix (trigger `validate_key_prefix_insert_trigger`)
   - Inserts new key row in `keys` table
   - Inserts default locale translation with `updated_by_user_id = auth.uid()`
   - Trigger `trim_translation_value_insert_trigger` auto-trims value and converts empty to NULL
   - Trigger `validate_translation_default_locale_insert_trigger` prevents NULL/empty for default locale
   - Trigger `fanout_translation_key_insert_trigger` creates NULL translations for all other locales
   - `key_created` telemetry event is emitted by trigger `emit_key_created_event` after insert into `keys`
7. Database enforces unique constraint on (project_id, full_key)
8. On conflict, PostgreSQL returns unique violation error → hook returns 409
9. On prefix mismatch, trigger raises exception → hook returns 400
10. On success, RPC returns `{ key_id }`
11. TanStack Query invalidates key list caches (all views)
12. Component displays success message or navigates

### 5.4 Delete Key Flow

1. User confirms key deletion
2. `useDeleteKey` mutation hook receives key ID
3. Hook validates UUID format using `UUID_SCHEMA` (shared UUID schema)
4. Hook calls Supabase `.delete().eq('id', keyId)`
5. RLS policy validates project ownership via JOIN
6. If unauthorized or not found, returns 404
7. PostgreSQL CASCADE DELETE removes all related data:
   - All translations for this key (via ON DELETE CASCADE)
8. On success, Supabase returns 204 No Content
9. TanStack Query invalidates all key-related caches
10. Component refreshes list or navigates

## 6. Security Considerations

### 6.1 Authentication

- All endpoints require valid JWT access token in `Authorization: Bearer {token}` header
- Token is obtained via Supabase Auth during sign-in
- Token is stored in Supabase client session and automatically included in requests
- Token expiration is handled by Supabase client with automatic refresh

### 6.2 Authorization

- RPC functions perform authorization checks by verifying project ownership
- Users can only access keys for projects they own
- RLS policies on `keys` table ensure `project_id` belongs to user
- RLS policy: `keys_owner_policy FOR ALL` — USING/WITH CHECK via project ownership

### 6.3 Input Validation

- **Client-side validation:** Zod schemas validate all input before sending to backend
- **Database-level validation:** CHECK constraints and triggers enforce data integrity
- **Key format validation:** Pattern `^[a-z0-9._-]+$`, no `..`, no trailing dot
- **Prefix requirement:** Trigger `validate_key_prefix_insert_trigger` ensures key starts with project prefix + "."
- **Value validation:** Max 250 chars, no newline, auto-trimmed
- **Default locale value:** Trigger `validate_translation_default_locale_insert_trigger` prevents NULL/empty for default locale
- **Unique constraint:** Database enforces uniqueness of (project_id, full_key)

### 6.4 SQL Injection Prevention

- Supabase client uses parameterized queries for all operations
- Never construct raw SQL strings from user input
- RPC functions use typed parameters
- Trigram search uses PostgreSQL's safe `ILIKE` operator with parameterized values

### 6.5 Data Exposure

- Keys are filtered by project ownership via RLS policies
- Search functionality doesn't leak keys from other users' projects
- Missing counts don't expose information about other users

### 6.6 XSS Prevention

- All key names and values should be sanitized when displayed in UI
- React automatically escapes content, but be careful with `dangerouslySetInnerHTML`
- Validate that values don't contain script tags or malicious content

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Empty or invalid key name
- Key name > 256 characters
- Key name contains invalid characters
- Key name contains `..` or ends with dot
- Empty or invalid translation value
- Value > 250 characters
- Value contains newlines
- Invalid project ID or locale format
- Invalid pagination parameters (limit > 100, negative offset)
- Missing required parameters (locale for per-language view)

**Handling:**

Zod validation errors are automatically converted to ApiErrorResponse format by the global QueryClient error handler configured in `src/app/config/queryClient/queryClient.ts`. This ensures consistent error format across all queries and mutations without requiring try/catch blocks in individual hooks.

**Result Format:**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "details": {
      "constraint": "max",
      "field": "p_full_key"
    },
    "message": "Key name must be at most 256 characters"
  }
}
```

### 7.2 Authorization Errors (403/404)

**Trigger Conditions:**

- User attempts to access keys for project owned by another user
- RPC function authorization check fails

**Handling:**

- RPC returns empty result or error
- Return 403 "Project not owned by user"
- Distinguish from 404 to provide clear feedback

### 7.3 Conflict Errors (409)

**Trigger Conditions:**

- Duplicate key name (full_key) within same project

**Handling:**

- Catch PostgreSQL unique constraint violation error code `23505`
- Check constraint name `keys_unique_per_project`
- Return user-friendly message: "Key already exists in project"

**Example:**

```typescript
const { data, error } = await supabase.rpc('create_key_with_value', validatedData);

if (error) {
  throw createDatabaseErrorResponse(error, 'useCreateKey', 'Failed to create key');
}

// The createDatabaseErrorResponse function handles the error mapping:
// - 23505 with 'keys_unique_per_project' -> 409 'Key already exists in project'
// - Trigger exception 'must start with project prefix' -> 400 'Key must start with project prefix'
// - Trigger exception 'cannot be NULL or empty' -> 400 'Default locale value cannot be empty'
// - 23514 check constraint -> 400 'Invalid field value'
```

### 7.4 Database Trigger Errors (400)

**Trigger Conditions:**

- Key doesn't start with project prefix (prevented by `validate_key_prefix_insert_trigger`)
- Empty value for default locale (prevented by `validate_translation_default_locale_insert_trigger`)

**Handling:**

- Catch PostgreSQL RAISE EXCEPTION from trigger
- Return 400 with specific message based on trigger:
  - For prefix mismatch: "Key must start with project prefix"
  - For empty default value: "Default locale value cannot be empty"

### 7.5 Not Found Errors (404)

**Trigger Conditions:**

- Key ID doesn't exist
- Project ID doesn't exist
- Locale doesn't exist in project (per-language view returns empty result)
- RLS policy denies access (appears as not found for delete operations)

**Handling:**

```typescript
import { createApiErrorResponse } from '@/shared/utils';

const { count, error } = await supabase.from('keys').delete().eq('id', keyId);

if (count === 0) {
  throw createApiErrorResponse(404, 'Key not found or access denied');
}
```

### 7.6 Server Errors (500)

**Trigger Conditions:**

- Database connection failure
- RPC function execution error
- Unexpected database constraint violation
- Cascade delete failure
- Fan-out trigger failure

**Handling:**

- Log full error details to console (development)
- Return generic message to user: "An unexpected error occurred. Please try again."
- Do not expose internal error details to client

**Example:**

```typescript
const { data, error } = await supabase.rpc('create_key_with_value', validatedData);

if (error) {
  throw createDatabaseErrorResponse(error, 'useCreateKey', 'Failed to create key');
}

// The createDatabaseErrorResponse function logs the error and returns a structured ApiErrorResponse
// For unknown errors, it returns a 500 status with the fallback message
```

## 8. Performance Considerations

### 8.1 Query Optimization

**Indexing:**

- Primary key index on `id` (auto-created)
- Composite unique index on `(project_id, full_key)` for fast duplicate checking
- Index on `project_id` for efficient filtering (defined in `supabase/migrations/20251013143200_create_indexes.sql`)
- Trigram index `idx_keys_full_key_trgm` for efficient search (defined in migrations)
- Index on `translations` table: `idx_translations_missing` for missing filter
- Index on `translations` table: `(key_id, locale)` for fast lookups

**Pagination:**

- Use `limit` and `offset` for offset-based pagination
- Default limit of 50 balances UX and performance
- Max limit of 100 prevents excessive data transfer

**Search Optimization:**

- Trigram indexes enable fast case-insensitive substring search
- Search only on `full_key` field to reduce complexity
- Database performs search, not client-side filtering

**Missing Count Optimization:**

- Default view uses subquery to count NULL translations efficiently
- Subquery is executed once per key, not per translation
- Index on `translations` table improves subquery performance

### 8.2 Caching Strategy

**TanStack Query Configuration:**

```typescript
// List keys (default view): 3-minute cache
staleTime: 3 * 60 * 1000,
gcTime: 10 * 60 * 1000,

// List keys (per-language view): 3-minute cache
staleTime: 3 * 60 * 1000,
gcTime: 10 * 60 * 1000,
```

**Cache Invalidation:**

- Create key → invalidate all key list caches (default and all per-language views)
- Delete key → invalidate all key list caches
- Update translation (future endpoint) → invalidate per-language view cache for that locale

**Cache Keys:**

- Default view: `['keys', 'default', projectId, params]`
- Per-language view: `['keys', 'per-language', projectId, locale, params]`
- Use structured query keys for fine-grained invalidation

### 8.3 Fan-Out Performance

**Key Creation:**

- Trigger `fanout_translation_key_insert_trigger` creates translations for all locales
- Fan-out is performed in a single transaction
- If project has many locales (e.g., 20+), creation may be slower
- Consider async fan-out for large projects (future optimization)

**Mitigation:**

- Keep locale count reasonable (MVP targets < 20 locales)
- Monitor RPC execution time in production
- Consider batch insert optimization if needed

### 8.4 Database Performance

**RPC Function Optimization:**

- `list_keys_default_view` uses efficient subquery for missing_count
- `list_keys_per_language_view` uses JOIN with indexed columns
- Both RPCs use indexed filters for search and missing_only

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

```bash
mkdir -p src/features/keys/{api}
```

### Step 2: Create Keys Constants

Create `src/shared/constants/keys.constants.ts` with centralized constants, patterns, and utilities:

```typescript
/**
 * Keys Constants and Validation Patterns
 *
 * Centralized definitions for key validation patterns to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL domain constraints.
 */

// Validation patterns
export const KEY_FORMAT_PATTERN = /^[a-z0-9._-]+$/;
export const CONSECUTIVE_DOTS_PATTERN = /\.\./;
export const TRAILING_DOT_PATTERN = /\.$/;

// Length constraints
export const KEY_NAME_MAX_LENGTH = 256;
export const KEY_NAME_MIN_LENGTH = 1;
export const TRANSLATION_VALUE_MAX_LENGTH = 250;
export const TRANSLATION_VALUE_MIN_LENGTH = 1;

// Pagination defaults
export const KEYS_DEFAULT_LIMIT = 50;
export const KEYS_MAX_LIMIT = 100;
export const KEYS_MIN_OFFSET = 0;

// PostgreSQL error codes and constraints
export const KEYS_PG_ERROR_CODES = {
  CHECK_VIOLATION: '23514',
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
} as const;

export const KEYS_CONSTRAINTS = {
  PROJECT_ID_FKEY: 'keys_project_id_fkey',
  UNIQUE_PER_PROJECT: 'keys_unique_per_project',
} as const;

// Centralized error messages
export const KEYS_ERROR_MESSAGES = {
  // Validation errors
  KEY_REQUIRED: 'Key name is required',
  KEY_TOO_LONG: `Key name must be at most ${KEY_NAME_MAX_LENGTH} characters`,
  KEY_INVALID_FORMAT: 'Key can only contain lowercase letters, numbers, dots, underscores, and hyphens',
  KEY_CONSECUTIVE_DOTS: 'Key cannot contain consecutive dots',
  KEY_TRAILING_DOT: 'Key cannot end with a dot',

  VALUE_REQUIRED: 'Value cannot be empty',
  VALUE_TOO_LONG: `Value must be at most ${TRANSLATION_VALUE_MAX_LENGTH} characters`,
  VALUE_NO_NEWLINES: 'Value cannot contain newlines',

  // Database operation errors
  KEY_ALREADY_EXISTS: 'Key already exists in project',
  KEY_INVALID_PREFIX: 'Key must start with project prefix',
  DEFAULT_VALUE_EMPTY: 'Default locale value cannot be empty',
  INVALID_PROJECT_ID: 'Invalid project_id',
  PROJECT_NOT_OWNED: 'Project not owned by user',
  KEY_NOT_FOUND: 'Key not found or access denied',

  // Generic errors
  DATABASE_ERROR: 'Database operation failed',
  NO_DATA_RETURNED: 'No data returned from server',
  INVALID_FIELD_VALUE: 'Invalid field value',
  REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource not found',
} as const;

// Default parameters
export const KEYS_DEFAULT_PARAMS = {
  LIMIT: KEYS_DEFAULT_LIMIT,
  MISSING_ONLY: false,
  OFFSET: KEYS_MIN_OFFSET,
  SEARCH: undefined,
} as const;

// Validation utilities
export const KEY_VALIDATION = {
  isValidFormatClient: (key: string): boolean => {
    if (!key || typeof key !== 'string') return false;
    if (key.length < KEY_NAME_MIN_LENGTH || key.length > KEY_NAME_MAX_LENGTH) return false;
    if (!KEY_FORMAT_PATTERN.test(key)) return false;
    if (CONSECUTIVE_DOTS_PATTERN.test(key)) return false;
    if (TRAILING_DOT_PATTERN.test(key)) return false;
    return true;
  },

  isValidTranslationValue: (value: string): boolean => {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (trimmed.length < TRANSLATION_VALUE_MIN_LENGTH || trimmed.length > TRANSLATION_VALUE_MAX_LENGTH) return false;
    if (trimmed.includes('\n')) return false;
    return true;
  },

  startsWithPrefix: (key: string, prefix: string): boolean => {
    return key.startsWith(`${prefix}.`);
  },

  extractKeyName: (fullKey: string, prefix: string): string => {
    if (!KEY_VALIDATION.startsWithPrefix(fullKey, prefix)) {
      return fullKey;
    }
    return fullKey.substring(prefix.length + 1);
  },

  buildFullKey: (prefix: string, keyName: string): string => {
    return `${prefix}.${keyName}`;
  },
};
```

Add to `src/shared/constants/index.ts`:

```typescript
export * from './locale.constants';
export * from './keys.constants';
```

### Step 3: Create Zod Validation Schemas

Create `src/features/keys/api/keys.schemas.ts` with all validation schemas defined in section 3.2.

### Step 4: Create Error Handling Utilities

Create `src/features/keys/api/keys.errors.ts`:

**Note:** The implementation now uses constants from `src/shared/constants/keys.constants.ts` for error codes, constraint names, and error messages. This ensures consistency across the application.

```typescript
import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { createApiErrorResponse } from '@/shared/utils';
import { KEYS_PG_ERROR_CODES, KEYS_CONSTRAINTS, KEYS_ERROR_MESSAGES } from '@/shared/constants';

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors including:
 * - Unique constraint violations (23505)
 * - Check constraint violations (23514)
 * - Trigger violations (prefix validation, empty default value)
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
  if (error.code === KEYS_PG_ERROR_CODES.UNIQUE_VIOLATION) {
    if (error.message.includes(KEYS_CONSTRAINTS.UNIQUE_PER_PROJECT)) {
      return createApiErrorResponse(409, KEYS_ERROR_MESSAGES.KEY_ALREADY_EXISTS);
    }
  }

  // Handle trigger violations
  if (error.message.includes('must start with project prefix')) {
    return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.KEY_INVALID_PREFIX);
  }
  if (error.message.includes('cannot be NULL or empty') || error.message.toLowerCase().includes('default_locale')) {
    return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.DEFAULT_VALUE_EMPTY);
  }

  // Handle check constraint violations
  if (error.code === KEYS_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.INVALID_FIELD_VALUE, { constraint: error.details });
  }

  // Handle foreign key violations
  if (error.code === KEYS_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    if (error.message.includes(KEYS_CONSTRAINTS.PROJECT_ID_FKEY)) {
      return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.INVALID_PROJECT_ID);
    }
    return createApiErrorResponse(400, KEYS_ERROR_MESSAGES.REFERENCED_RESOURCE_NOT_FOUND);
  }

  // Handle authorization errors (project not found or not owned)
  if (error.message.includes('not found') || error.message.includes('access denied')) {
    return createApiErrorResponse(403, KEYS_ERROR_MESSAGES.PROJECT_NOT_OWNED);
  }

  // Generic database error
  return createApiErrorResponse(500, fallbackMessage || KEYS_ERROR_MESSAGES.DATABASE_ERROR, { original: error });
}
```

### Step 5: Create Query Keys Factory

Create `src/features/keys/api/keys.key-factory.ts`:

```typescript
import type { ListKeysDefaultViewParams, ListKeysPerLanguageParams } from '@/shared/types';

// query key factory for keys, follows tanstack query best practices for structured query keys
export const KEYS_KEY_FACTORY = {
  all: ['keys'] as const,
  defaultView: (projectId: string, params: Omit<ListKeysDefaultViewParams, 'project_id'>) =>
    [...KEYS_KEY_FACTORY.defaultViews(projectId), params] as const,
  defaultViews: (projectId: string) => [...KEYS_KEY_FACTORY.all, 'default', projectId] as const,
  detail: (keyId: string) => [...KEYS_KEY_FACTORY.details(), keyId] as const,
  details: () => [...KEYS_KEY_FACTORY.all, 'detail'] as const,
  perLanguageView: (
    projectId: string,
    locale: string,
    params: Omit<ListKeysPerLanguageParams, 'project_id' | 'locale'>
  ) => [...KEYS_KEY_FACTORY.perLanguageViews(projectId, locale), params] as const,
  perLanguageViews: (projectId: string, locale: string) =>
    [...KEYS_KEY_FACTORY.all, 'per-language', projectId, locale] as const,
};
```

### Step 6: Create TanStack Query Hooks

**Implementation Notes:**

- All hooks follow TanStack Query best practices with proper error handling
- Use optimistic updates for better UX in mutation hooks
- Implement proper cache invalidation strategies
- Include TypeScript generics for type safety and RPC parameter handling

**6.1 Create `src/features/keys/api/useKeysDefaultView/useKeysDefaultView.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { ApiErrorResponse, KeyDefaultViewListResponse, ListKeysDefaultViewParams } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../keys.errors';
import { KEYS_KEY_FACTORY } from '../keys.key-factory';
import { KEY_DEFAULT_VIEW_RESPONSE_SCHEMA, LIST_KEYS_DEFAULT_VIEW_SCHEMA } from '../keys.schemas';

/**
 * Fetch a paginated list of keys in default language view with missing counts
 *
 * Uses the RPC function `list_keys_default_view` with exact total counting
 * enabled. Returns keys with their default locale values and missing counts
 * for other locales. Data items are validated at runtime and pagination
 * metadata is computed from input params and result size.
 *
 * @param params - Query parameters for key listing
 * @param params.project_id - Project UUID to fetch keys from (required)
 * @param params.search - Search term for key name (case-insensitive contains, optional)
 * @param params.missing_only - Filter keys with missing translations (default: false)
 * @param params.limit - Items per page (1-100, default: 50)
 * @param params.offset - Pagination offset (min: 0, default: 0)
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid project_id, limit > 100, negative offset)
 * @throws {ApiErrorResponse} 403 - Project not owned by user
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns TanStack Query result with keys data and pagination metadata
 */
export function useKeysDefaultView(params: ListKeysDefaultViewParams) {
  const supabase = useSupabase();

  return useQuery<KeyDefaultViewListResponse, ApiErrorResponse>({
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      const { limit, missing_only, offset, project_id, search } = LIST_KEYS_DEFAULT_VIEW_SCHEMA.parse(params);

      const { count, data, error } = await supabase.rpc(
        'list_keys_default_view',
        {
          p_limit: limit,
          p_missing_only: missing_only,
          p_offset: offset,
          p_project_id: project_id,
          p_search: search,
        },
        { count: 'exact' }
      );

      if (error) {
        throw createDatabaseErrorResponse(error, 'useKeysDefaultView', 'Failed to fetch keys');
      }

      // runtime validation of response data
      const keys = z.array(KEY_DEFAULT_VIEW_RESPONSE_SCHEMA).parse(data || []);

      return {
        data: keys,
        metadata: {
          end: (offset || 0) + keys.length - 1,
          start: offset || 0,
          total: count || 0,
        },
      };
    },
    queryKey: KEYS_KEY_FACTORY.defaultView(params.project_id, {
      limit: params.limit,
      missing_only: params.missing_only,
      offset: params.offset,
      search: params.search,
    }),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
```

**6.2 Create `src/features/keys/api/useKeysPerLanguageView/useKeysPerLanguageView.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { ApiErrorResponse, KeyPerLanguageViewListResponse, ListKeysPerLanguageParams } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../keys.errors';
import { KEYS_KEY_FACTORY } from '../keys.key-factory';
import { KEY_PER_LANGUAGE_VIEW_RESPONSE_SCHEMA, LIST_KEYS_PER_LANGUAGE_VIEW_SCHEMA } from '../keys.schemas';

/**
 * Fetch a paginated list of keys for a specific language with translation metadata
 *
 * Uses the RPC function `list_keys_per_language_view` with exact total counting
 * enabled. Returns keys with their translation values and metadata for the
 * specified locale. Data items are validated at runtime and pagination
 * metadata is computed from input params and result size.
 *
 * @param params - Query parameters for key listing per language
 * @param params.project_id - Project UUID to fetch keys from (required)
 * @param params.locale - Target locale code in BCP-47 format (required, e.g., "en", "en-US")
 * @param params.search - Search term for key name (case-insensitive contains, optional)
 * @param params.missing_only - Filter keys with NULL values in selected locale (default: false)
 * @param params.limit - Items per page (1-100, default: 50)
 * @param params.offset - Pagination offset (min: 0, default: 0)
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid project_id, malformed locale, limit > 100, negative offset)
 * @throws {ApiErrorResponse} 403 - Project not owned by user
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 *
 * @returns TanStack Query result with keys data and pagination metadata
 */
export function useKeysPerLanguageView(params: ListKeysPerLanguageParams) {
  const supabase = useSupabase();

  return useQuery<KeyPerLanguageViewListResponse, ApiErrorResponse>({
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      const { limit, locale, missing_only, offset, project_id, search } =
        LIST_KEYS_PER_LANGUAGE_VIEW_SCHEMA.parse(params);

      const { count, data, error } = await supabase.rpc(
        'list_keys_per_language_view',
        {
          p_limit: limit,
          p_locale: locale,
          p_missing_only: missing_only,
          p_offset: offset,
          p_project_id: project_id,
          p_search: search,
        },
        { count: 'exact' }
      );

      if (error) {
        throw createDatabaseErrorResponse(error, 'useKeysPerLanguageView', 'Failed to fetch keys');
      }

      // runtime validation of response data
      const keys = z.array(KEY_PER_LANGUAGE_VIEW_RESPONSE_SCHEMA).parse(data || []);

      return {
        data: keys,
        metadata: {
          end: (offset || 0) + keys.length - 1,
          start: offset || 0,
          total: count || 0,
        },
      };
    },
    queryKey: KEYS_KEY_FACTORY.perLanguageView(params.project_id, params.locale, {
      limit: params.limit,
      missing_only: params.missing_only,
      offset: params.offset,
      search: params.search,
    }),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
```

**6.3 Create `src/features/keys/api/useCreateKey/useCreateKey.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiErrorResponse, CreateKeyRequest, CreateKeyResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { KEYS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../keys.errors';
import { KEYS_KEY_FACTORY } from '../keys.key-factory';
import { CREATE_KEY_RESPONSE_SCHEMA, CREATE_KEY_SCHEMA } from '../keys.schemas';

/**
 * Create a new translation key with default value
 *
 * Uses the RPC function `create_key_with_value` to create a key and its
 * default translation value in a single transaction. The database enforces
 * prefix validation, uniqueness, and triggers automatic fan-out to all locales
 * with NULL values. Key name must start with project prefix and follow naming rules.
 *
 * @param projectId - Project UUID for cache invalidation (required)
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid key format, empty value, prefix mismatch)
 * @throws {ApiErrorResponse} 409 - Conflict error (duplicate key name in project)
 * @throws {ApiErrorResponse} 500 - Database error or no data returned
 *
 * @returns TanStack Query mutation hook for creating keys
 */
export function useCreateKey(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<CreateKeyResponse, ApiErrorResponse, CreateKeyRequest>({
    mutationFn: async (payload) => {
      const { p_default_value, p_full_key, p_project_id } = CREATE_KEY_SCHEMA.parse(payload);

      const { data, error } = await supabase
        .rpc('create_key_with_value', {
          p_default_value,
          p_full_key,
          p_project_id,
        })
        .single();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useCreateKey', 'Failed to create key');
      }

      if (!data) {
        throw createApiErrorResponse(500, KEYS_ERROR_MESSAGES.NO_DATA_RETURNED);
      }

      return CREATE_KEY_RESPONSE_SCHEMA.parse(data);
    },
    onSuccess: () => {
      // invalidate all key list caches for this project (default and all per-language views)
      queryClient.invalidateQueries({ queryKey: KEYS_KEY_FACTORY.defaultViews(projectId) });
      queryClient.invalidateQueries({ queryKey: KEYS_KEY_FACTORY.all });
    },
  });
}
```

**6.4 Create `src/features/keys/api/useDeleteKey/useDeleteKey.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { KEYS_ERROR_MESSAGES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../keys.errors';
import { KEYS_KEY_FACTORY } from '../keys.key-factory';
import { UUID_SCHEMA } from '../keys.schemas';

/**
 * Delete a translation key by ID
 *
 * Removes the key record and all associated translations via CASCADE DELETE.
 * Operation is irreversible and affects all locales in the project. RLS
 * policies ensure only project owners can delete keys. On success, related
 * caches are cleared and key lists are invalidated.
 *
 * @param projectId - Project UUID for cache invalidation (required)
 *
 * @throws {ApiErrorResponse} 400 - Validation error (invalid key ID format)
 * @throws {ApiErrorResponse} 404 - Key not found or access denied
 * @throws {ApiErrorResponse} 500 - Database error during deletion
 *
 * @returns TanStack Query mutation hook for deleting keys
 */
export function useDeleteKey(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiErrorResponse, string>({
    mutationFn: async (uuid) => {
      const id = UUID_SCHEMA.parse(uuid);

      const { count, error } = await supabase.from('keys').delete().eq('id', id);

      if (error) {
        throw createDatabaseErrorResponse(error, 'useDeleteKey', 'Failed to delete key');
      }

      if (count === 0) {
        throw createApiErrorResponse(404, KEYS_ERROR_MESSAGES.KEY_NOT_FOUND);
      }

      // return void (no content) to match rest 204 semantics
    },
    onSuccess: (_, uuid) => {
      // remove from cache
      queryClient.removeQueries({ queryKey: KEYS_KEY_FACTORY.detail(uuid) });
      // invalidate all list caches for this project
      queryClient.invalidateQueries({ queryKey: KEYS_KEY_FACTORY.defaultViews(projectId) });
      queryClient.invalidateQueries({ queryKey: KEYS_KEY_FACTORY.all });
    },
  });
}
```

After implementing each hook, add an `index.ts` inside its directory (for example, `useCreateKey/index.ts`) that re-exports the hook with `export * from './useCreateKey';` to support the barrel structure used by the keys API.

### Step 7: Create API Index File

Create `src/features/keys/api/index.ts`:

```typescript
export * from './keys.errors';
export * from './keys.key-factory';
export * from './keys.schemas';
export * from './useCreateKey';
export * from './useDeleteKey';
export * from './useKeysDefaultView';
export * from './useKeysPerLanguageView';
```

### Step 8: Write Unit Tests

**Testing Strategy:**

- Use Vitest with Testing Library for comprehensive test coverage
- Co-locate tests with source files (`Hook.test.ts` next to `Hook.ts`)
- Mock Supabase client using test utilities from `src/test/`
- Test both success and error scenarios with edge cases
- Verify cache behavior, pagination, and search functionality
- Aim for 90% coverage threshold as per project requirements

**8.1 Create `src/features/keys/api/useKeysDefaultView/useKeysDefaultView.test.ts`:**

Test scenarios:

- Successful list fetch with default-locale values (verify metadata: start=0, end=0, total=1)
- Successful list fetch with custom pagination (verify metadata: start=20, end=20, total=50)
- Successful list fetch with search filter
- Successful list fetch with missing_only filter
- Empty results (verify metadata: start=0, end=-1, total=0)
- Validation error for invalid params (invalid project_id, limit > 100)
- Authorization error (403)
- Database error handling
- **Edge case: limit = 0**
- **Edge case: offset > total count**
- **Performance test: large dataset (1000+ keys)**
- **Edge case: special characters in search**

**8.2 Create `src/features/keys/api/useKeysPerLanguageView/useKeysPerLanguageView.test.ts`:**

Test scenarios:

- Successful list fetch with required parameters
- Successful list fetch with search filter
- Successful list fetch with missing_only filter
- Verify fields: `value` can be null, `updated_by_user_id` can be null, `updated_source` ∈ {'user','system'}
- Validation error for missing locale
- Validation error for invalid locale format
- Empty results for non-existent locale
- Authorization error (403)
- Database error handling
- **Invalid locale format (malformed BCP-47)**
- **Locale not in project**
- **Empty project with no keys**
- **Edge case: mixed translated/untranslated keys**

**8.3 Create `src/features/keys/api/useCreateKey/useCreateKey.test.ts`:**

Test scenarios:

- Successful key creation
- Validation error (invalid key format, consecutive dots, trailing dot) — aligned with Zod from section 3.2
- Validation error (empty value, value too long, value with newlines)
- Duplicate key conflict (409)
- Prefix mismatch error (400) — match trigger message (`default_locale` / `cannot be NULL or empty`)
- Authorization error (403)
- Database error
- **Concurrent key creation (race conditions)**
- **Prefix validation edge cases (case sensitivity)**
- **Value trimming and normalization**
- **Edge case: Unicode characters in key names**

**8.4 Create `src/features/keys/api/useDeleteKey/useDeleteKey.test.ts`:**

Test scenarios:

- Successful deletion
- Invalid UUID format
- Key not found (404)
- Verify cache invalidation (all list caches)
- **Cascade delete verification (translations cleanup)**
- **Cache invalidation for multiple views**
- **Edge case: concurrent deletion attempts**
- **Authorization edge cases**
