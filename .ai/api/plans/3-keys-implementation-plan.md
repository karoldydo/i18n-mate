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

Note: Raw RPC returns an array of rows and uses p\_-prefixed parameter names (e.g., `p_project_id`, `p_limit`). Client hooks map UI params to RPC params and wrap the result into `{ data, metadata }` using Supabase exact count and pagination params.

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

Note: Raw RPC returns an array of rows and uses p\_-prefixed parameter names (e.g., `p_project_id`, `p_locale`, `p_limit`). Client hooks map UI params to RPC params and wrap the result into `{ data, metadata }` using Supabase exact count and pagination params.

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

**Note:** As of the latest refactoring, all types are organized by feature in separate directories under `src/shared/types/`.

### 3.1 Existing Types

**Import Path:** `@/shared/types` (central export) or `@/shared/types/keys` (feature-specific)

**Shared Types** (from `src/shared/types/types.ts`):

- `PaginationParams` - Query parameters for pagination
- `PaginationMetadata` - Response metadata with total count
- `PaginatedResponse<T>` - Generic paginated response wrapper
- `ApiErrorResponse` - Generic error response wrapper
- `ValidationErrorResponse` - 400 validation error response
- `ConflictErrorResponse` - 409 conflict error response

**Keys Types** (from `src/shared/types/keys/index.ts`):

- `KeyDefaultViewResponse` / `KeyDefaultViewListResponse` — default view row shape and paginated wrapper with `PaginationMetadata`.
- `KeyPerLanguageViewResponse` / `KeyPerLanguageViewListResponse` — per-locale row shape with `is_machine_translated`, `updated_*`, and value that may be null.
- `CreateKeyRequest` / `CreateKeyResponse` — UI payload with `full_key`, `default_value`, `project_id` and RPC result containing `key_id`.
- `ListKeysDefaultViewParams` / `ListKeysPerLanguageParams` — list query params (incl. `missing_only`, `search`, `project_id`, `locale`).
- RPC args mirrors: `ListKeysDefaultViewRpcArgs` / `ListKeysPerLanguageViewRpcArgs` expose `p_`-prefixed fields used by Supabase.

### 3.2 Zod Validation Schemas

Create validation schemas in `src/features/keys/api/keys.schemas.ts`:

- `FULL_KEY_SCHEMA` — uses `KEY_FORMAT_PATTERN`, min/max, forbids `..` and trailing dot per `KEYS_ERROR_MESSAGES`.
- `TRANSLATION_VALUE_SCHEMA` — trims and bounds length, disallows newlines for default values.

- `LOCALE_CODE_SCHEMA` — validates BCP‑47 (`ll` or `ll-CC`); `UUID_SCHEMA` — validates UUIDs for identifiers.
- `LIST_KEYS_DEFAULT_VIEW_SCHEMA` — normalizes `limit`/`offset` and `missing_only`, requires `project_id`, optional `search`.
- `LIST_KEYS_PER_LANGUAGE_VIEW_SCHEMA` — extends default view schema with required `locale`.
- `CREATE_KEY_REQUEST_SCHEMA` — validates UI payload; `CREATE_KEY_SCHEMA` — maps to RPC args with `p_` prefixes.
- `KEY_DEFAULT_VIEW_RESPONSE_SCHEMA` / `KEY_PER_LANGUAGE_VIEW_RESPONSE_SCHEMA` / `CREATE_KEY_RESPONSE_SCHEMA` — runtime response validation.

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

1. User submits key creation form with `full_key` and `default_value`.
2. `useCreateKey` mutation hook receives form data.
3. Hook validates data using `CREATE_KEY_SCHEMA`.
4. Hook fetches project prefix by `project_id` and checks `full_key` starts with `${prefix}.`; on mismatch returns 400 `KEY_INVALID_PREFIX`.
5. If validation fails otherwise, return 400 error immediately.
6. Hook calls Supabase RPC `create_key_with_value` with validated data.
7. RPC function atomically:
   - Validates key prefix matches project prefix (trigger `validate_key_prefix_insert_trigger`)
   - Inserts new key row in `keys` table
   - Inserts default locale translation with `updated_by_user_id = auth.uid()`
   - Trigger `trim_translation_value_insert_trigger` auto-trims value and converts empty to NULL
   - Trigger `validate_translation_default_locale_insert_trigger` prevents NULL/empty for default locale
   - Trigger `fanout_translation_key_insert_trigger` creates NULL translations for all other locales
   - `key_created` telemetry event is emitted by trigger `emit_key_created_event` after insert into `keys`
8. Database enforces unique constraint on `(project_id, full_key)`.
9. On conflict, PostgreSQL returns unique violation error → hook returns 409.
10. On success, RPC returns `{ key_id }`.
11. TanStack Query invalidates key list caches (all views).
12. Component displays success message or navigates.

### 5.4 Delete Key Flow

1. User confirms key deletion
2. `useDeleteKey` mutation hook receives key ID
3. Hook validates UUID format using `UUID_SCHEMA` (shared UUID schema)
4. Hook calls Supabase `.delete().eq('id', keyId)`
5. RLS policy validates project ownership via JOIN
6. If unauthorized or not found, returns 404
7. PostgreSQL CASCADE DELETE removes all related data:
   - All translations for this key (via ON DELETE CASCADE)
8. On success, hook returns `void` (Supabase provides affected `count`)
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

- Client hooks validate inputs with Zod and return standardized `ApiErrorResponse` via shared utilities without per-hook try/catch.
- Validation runs before any Supabase call, ensuring consistent 400 responses for malformed payloads or params.

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

- Return 403 `PROJECT_NOT_OWNED` when ownership checks fail; some flows (e.g., create pre-check) may surface 404 when project is not visible.
- Distinguish from 404 to avoid leaking resource existence; delete treats missing as 404.

### 7.3 Conflict Errors (409)

**Trigger Conditions:**

- Duplicate key name (full_key) within same project

**Handling:**

- Catch PostgreSQL unique constraint violation error code `23505`
- Check constraint name `keys_unique_per_project`
- Return user-friendly message: "Key already exists in project"

**Example:**

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

- Default and per-language lists use `staleTime: 3m` and `gcTime: 10m` for freshness vs. memory.
- Mutations invalidate list caches to keep both views consistent.

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

- Create `src/features/keys/api` to host schemas, errors, key factory, and hooks.

### Step 2: Create Keys Constants

Create `src/shared/constants/keys.constants.ts` with centralized constants and utilities:

- Patterns and lengths: `KEY_FORMAT_PATTERN`, `CONSECUTIVE_DOTS_PATTERN`, `KEY_TRAILING_DOT_PATTERN`, name/value min/max.
- Pagination defaults: `KEYS_DEFAULT_LIMIT`, `KEYS_MAX_LIMIT`, `KEYS_MIN_OFFSET`, and `KEYS_DEFAULT_PARAMS`.
- Error mapping: `KEYS_PG_ERROR_CODES`, `KEYS_CONSTRAINTS`, `KEYS_ERROR_MESSAGES` shared by schemas and error utils.
- Helpers: `KEY_VALIDATION` with lightweight client checks; re-export via `src/shared/constants/index.ts`.

### Step 3: Create Zod Validation Schemas

Create `src/features/keys/api/keys.schemas.ts` with all validation schemas defined in section 3.2.

### Step 4: Create Error Handling Utilities

Create `src/features/keys/api/keys.errors.ts`:

- Normalize common Postgres errors via `createDatabaseErrorResponse`: `23505` → 409 (`KEY_ALREADY_EXISTS`), `23514` → 400, FK issues → 400.
- Map trigger messages to 400: prefix mismatch (`KEY_INVALID_PREFIX`), empty default value (`DEFAULT_VALUE_EMPTY`).
- Return 403 for ownership/visibility issues; fall back to 500 `DATABASE_ERROR` with safe details.

### Step 5: Create Query Keys Factory

Create `src/features/keys/api/keys.key-factory.ts`:

- Provide structured keys: `all`, `defaultViews(projectId)`, `defaultView(projectId, params)`, `perLanguageViews(projectId, locale)`, `perLanguageView(projectId, locale, params)`, `details()`, `detail(id)`.
- Use nested array keys to enable granular cache invalidation across default and per-language views.

### Step 6: Create TanStack Query Hooks

**Implementation Notes:**

- Hooks follow TanStack Query best practices with centralized error mapping and runtime validation.
- No optimistic updates; rely on structured cache keys and targeted invalidation for consistency.

**6.1 Create `src/features/keys/api/useKeysDefaultView/useKeysDefaultView.ts`:**

- Validate `ListKeysDefaultViewParams`, call RPC `list_keys_default_view`, and return `{ data, metadata }` with exact `count`.
- Validate items via `KEY_DEFAULT_VIEW_RESPONSE_SCHEMA`; key with `KEYS_KEY_FACTORY.defaultView(...)`; 3m `staleTime`, 10m `gcTime`.

**6.2 Create `src/features/keys/api/useKeysPerLanguageView/useKeysPerLanguageView.ts`:**

- Validate `ListKeysPerLanguageParams` (incl. `locale`), call `list_keys_per_language_view`, and return `{ data, metadata }`.
- Validate items with `KEY_PER_LANGUAGE_VIEW_RESPONSE_SCHEMA`; key via `KEYS_KEY_FACTORY.perLanguageView(...)` (3m/10m); map errors centrally.

**6.3 Create `src/features/keys/api/useCreateKey/useCreateKey.ts`:**

- Parse `CreateKeyRequest` with `CREATE_KEY_SCHEMA`, perform a client-side prefix check against project `prefix`, then call `create_key_with_value`; validate via `CREATE_KEY_RESPONSE_SCHEMA`.
- On success, invalidate `KEYS_KEY_FACTORY.defaultViews(projectId)` and `KEYS_KEY_FACTORY.all`; map errors with `createDatabaseErrorResponse`.

**6.4 Create `src/features/keys/api/useDeleteKey/useDeleteKey.ts`:**

- Create the hook with `projectId` for targeted invalidation; validate id via `UUID_SCHEMA`, delete by id from `keys`, and return `void` when `count > 0`.
- On success, remove `detail(id)` cache and invalidate `KEYS_KEY_FACTORY.defaultViews(projectId)` and `KEYS_KEY_FACTORY.all`; map DB errors to standardized responses and surface 404 when nothing is deleted.

After implementing each hook, add an `index.ts` inside its directory (for example, `useCreateKey/index.ts`) that re-exports the hook with `export * from './useCreateKey';` to support the barrel structure used by the keys API.

### Step 7: Create API Index File

Create `src/features/keys/api/index.ts`:

- Barrel‑export `keys.errors`, `keys.key-factory`, `keys.schemas`, and hooks to keep imports concise and tree‑shakable.

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
