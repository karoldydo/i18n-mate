# API Endpoint Implementation Plan: Translations

## 1. Endpoint Overview

The Translations API provides operations for managing translation values for specific (project, key, locale) combinations. Each translation record contains the actual translated text along with metadata about its source (user vs. system), machine translation status, and update history. The API supports both single translation updates and bulk operations for efficiency.

### Key Features

- Single translation record retrieval with full metadata
- Inline editing with optimistic locking support to prevent lost updates
- Bulk update operations for translation jobs and batch processing
- Automatic value trimming and validation via database triggers
- Default locale value enforcement (cannot be NULL or empty)
- Machine translation metadata tracking
- **Centralized constants and validation patterns** for consistency between TypeScript and PostgreSQL constraints

### Endpoints Summary

1. **Get Translation** - `GET /rest/v1/translations?project_id=eq.{project_id}&key_id=eq.{key_id}&locale=eq.{locale}`
2. **Update Translation (Inline Edit)** - `PATCH /rest/v1/translations?project_id=eq.{project_id}&key_id=eq.{key_id}&locale=eq.{locale}[&updated_at=eq.{timestamp}]`

**Note:** Bulk update operations are handled internally by translation jobs and are not exposed as a client-facing API hook.

## 2. Request Details

### 2.1 Get Translation

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/translations?project_id=eq.{project_id}&key_id=eq.{key_id}&locale=eq.{locale}`
- **Authentication:** Required (JWT via Authorization header)
- **Parameters:**
  - Required (via query filters):
    - `project_id` (UUID) - Project ID
    - `key_id` (UUID) - Key ID
    - `locale` (string) - BCP-47 locale code
- **Request Body:** None

### 2.2 Update Translation (Inline Edit)

- **HTTP Method:** PATCH
- **URL Structure:** `/rest/v1/translations?project_id=eq.{project_id}&key_id=eq.{key_id}&locale=eq.{locale}[&updated_at=eq.{timestamp}]`
- **Authentication:** Required
- **Parameters:**
  - Required (via query filters):
    - `project_id` (UUID) - Project ID
    - `key_id` (UUID) - Key ID
    - `locale` (string) - BCP-47 locale code
  - Optional (via query filters):
    - `updated_at` (ISO 8601) - For optimistic locking
- **Request Body:**

```json
{
  "is_machine_translated": false,
  "updated_by_user_id": "uuid",
  "updated_source": "user",
  "value": "Witaj w domu"
}
```

**Field Validation:**

- `value` (required, string) - Max 250 chars, no newline, auto-trimmed, cannot be empty for default locale
- `is_machine_translated` (required, boolean) - false = manual edit, true = LLM-generated
- `updated_source` (required, enum) - "user" = manual edit, "system" = LLM translation
- `updated_by_user_id` (required for user updates, UUID) - User ID for manual edits, NULL for system updates

**Optimistic Locking (Recommended):**

- Include `updated_at` in the update filter to prevent lost updates; on mismatch return `409` and refetch the latest record.
- Clients should retry with the refreshed `updated_at` to complete the update safely.

## 3. Used Types

### 3.1 Existing Types

- Import via `@/shared/types` or feature-specific `@/shared/types/translations` depending on usage.
- `TranslationResponse` models a translation row; `UpdateTranslationRequest` includes all parameters (`project_id`, `key_id`, `locale`) and editable fields (`is_machine_translated`, `updated_by_user_id`, `updated_source`, `value`).
- Supabase-generated `Translation` and `TranslationUpdate` mirror the `translations` table for reads and partial updates.
- Error wrappers (`ApiErrorResponse`, `ValidationErrorResponse`, `ConflictErrorResponse`) provide a consistent error envelope across the feature.

### 3.2 New Zod Validation Schemas

- `TRANSLATION_VALUE_SCHEMA` enforces trimming, max length, and no-newline rules consistent with DB triggers.
- `LOCALE_CODE_SCHEMA` validates BCP-47; `PROJECT_ID_SCHEMA`, `KEY_ID_SCHEMA`, `USER_ID_SCHEMA` validate UUIDs.
- `UPDATE_SOURCE_SCHEMA` restricts values to `user` or `system` via `TRANSLATIONS_UPDATE_SOURCE_VALUES`.
- `GET_TRANSLATION_QUERY_SCHEMA` guards `project_id`, `key_id`, `locale`.
- `UPDATE_TRANSLATION_REQUEST_BODY_SCHEMA` validates only the PATCH body fields (editable fields without URL params).
- `UPDATE_TRANSLATION_REQUEST_SCHEMA` validates the full update request including all parameters (`project_id`, `key_id`, `locale`, optional `updated_at`) and body fields.
- `UPDATE_TRANSLATION_QUERY_SCHEMA` adds optional `updated_at`; `TRANSLATION_RESPONSE_SCHEMA` runtime-validates response payloads.

## 4. Response Details

### 4.1 Get Translation

**Success Response (200 OK):**

```json
[
  {
    "is_machine_translated": true,
    "key_id": "uuid",
    "locale": "pl",
    "project_id": "uuid",
    "updated_at": "2025-01-15T10:20:00Z",
    "updated_by_user_id": null,
    "updated_source": "system",
    "value": "Witaj w domu"
  }
]
```

### 4.2 Update Translation (Inline Edit)

**Success Response (200 OK):**

```json
{
  "is_machine_translated": false,
  "key_id": "uuid",
  "locale": "pl",
  "project_id": "uuid",
  "updated_at": "2025-01-15T11:00:00Z",
  "updated_by_user_id": "uuid",
  "updated_source": "user",
  "value": "Witaj w domu"
}
```

### 4.3 Error Responses

All error responses follow the structure: `{ data: null, error: { code, message, details? } }`

**400 Bad Request (Validation Error):**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "details": {
      "constraint": "max",
      "field": "value"
    },
    "message": "Value must be at most 250 characters"
  }
}
```

**400 Bad Request (Default Locale Empty Value):**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "message": "Default locale value cannot be empty"
  }
}
```

**404 Not Found:**

```json
{
  "data": null,
  "error": {
    "code": 404,
    "message": "Translation not found"
  }
}
```

**409 Conflict (Optimistic Lock Failure):**

```json
{
  "data": null,
  "error": {
    "code": 409,
    "message": "Translation was modified by another user. Please refresh and try again."
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

### 5.1 Get Translation Flow

1. User requests translation via React component (e.g., for editing)
2. TanStack Query hook (`useTranslation`) is invoked with project_id, key_id, and locale
3. Hook validates params using `GET_TRANSLATION_QUERY_SCHEMA`
4. Hook retrieves Supabase client from `useSupabase()` context
5. Client calls `.from('translations').select('*').eq('project_id', projectId).eq('key_id', keyId).eq('locale', locale).maybeSingle()`
6. RLS policy filters results by project ownership via foreign key to projects table
7. If unauthorized, Supabase returns null → hook throws 404 error
8. If found, translation data is cached by TanStack Query
9. Component renders translation editor with current value and metadata

### 5.2 Update Translation (Inline Edit) Flow

1. User edits translation value in inline editor with autosave (500ms debounce)
2. `useUpdateTranslation` mutation hook receives all parameters (`project_id`, `key_id`, `locale`) and new value with metadata in the payload
3. Hook validates body data using `UPDATE_TRANSLATION_REQUEST_BODY_SCHEMA` (only editable fields)
4. Hook calls Supabase `.update(validatedData).eq('project_id', projectId).eq('key_id', keyId).eq('locale', locale)`
5. If optimistic locking is enabled (via optional `updated_at` in payload), adds `.eq('updated_at', timestamp)` to WHERE clause
6. Database trigger `trim_translation_value_insert_trigger` auto-trims value and converts empty to NULL
7. Database trigger `validate_translation_default_locale_insert_trigger` prevents NULL for default locale
8. RLS policy validates project ownership
9. If optimistic lock fails (0 rows affected), hook returns 409
10. If unauthorized or not found, hook returns 404
11. On success, updated translation data is returned
12. Hook invalidates both per-language view cache (`['keys', 'per-language', projectId, locale]`) and default view cache (`['keys', 'default', projectId]`)
13. Component displays success feedback

## 6. Security Considerations

### 6.1 Authentication

- All endpoints require valid JWT access token in `Authorization: Bearer {token}` header
- Token is obtained via Supabase Auth during sign-in
- Token is stored in Supabase client session and automatically included in requests
- Token expiration is handled by Supabase client with automatic refresh

### 6.2 Authorization

- Row-Level Security (RLS) policies enforce project ownership validation
- RLS is applied on `translations` table via foreign key to `projects` table
- Users can only access translations for projects they own
- RLS policies are defined in `supabase/migrations/20251013143400_create_rls_policies.sql`
- Policy names:
  - `translations_select_policy` - SELECT where project.owner_user_id = auth.uid()
  - `translations_update_policy` - UPDATE where project.owner_user_id = auth.uid()

### 6.3 Input Validation

- **Client-side validation:** Zod schemas validate all input before sending to backend
- **Database-level validation:** CHECK constraints and triggers enforce data integrity
- **Value validation:** Max 250 chars, no newline, auto-trimmed by trigger
- **Default locale enforcement:** Trigger `validate_translation_default_locale_insert_trigger` prevents NULL/empty for default locale
- **Composite primary key:** Database enforces uniqueness of (project_id, key_id, locale)
- **Optimistic locking:** Optional `updated_at` timestamp prevents lost updates

### 6.4 SQL Injection Prevention

- Supabase client uses parameterized queries for all operations
- Never construct raw SQL strings from user input
- All filters use PostgREST's safe parameter binding

### 6.5 Data Exposure

- Translations are filtered by project ownership via RLS policies
- `updated_by_user_id` may be exposed (safe - it's the user who made the edit)
- No sensitive data is stored in translations table

### 6.6 Optimistic Locking

- Optional but recommended for preventing lost updates
- Include `updated_at` in WHERE clause during updates
- If timestamp doesn't match (row was modified), return 409 Conflict
- Client must refetch and retry with new timestamp

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Empty translation value for default locale
- Value > 250 characters
- Value contains newlines
- Invalid UUID format (project_id, key_id, user_id)
- Invalid locale format (not BCP-47)
- Invalid update_source (not "user" or "system")
- Missing required fields

**Handling:**

- Client-side `zod` errors are normalized to `ApiErrorResponse` in a shared error-mapping layer, keeping hooks free from repetitive try/catch logic.

**Result Format:**

- Shape: `{ data: null, error: { code: 400, message, details? } }` with `details` indicating constraint and field when applicable.
- Keep error envelope consistent via `ApiErrorResponse`; avoid revealing internal validation details beyond user-facing constraints.

### 7.2 Authorization Errors (403/404)

**Trigger Conditions:**

- User attempts to access translation for project owned by another user
- RLS policy denies access

**Handling:**

- Supabase returns empty result set for SELECT queries
- Return 404 "Translation not found" to avoid leaking existence
- Do not distinguish between "doesn't exist" and "access denied"

### 7.3 Conflict Errors (409)

**Trigger Conditions:**

- Optimistic locking failure (updated_at doesn't match current value)

**Handling:**

- Treat a zero-row update (with `updated_at` filter) as a conflict and return `409` using `createApiErrorResponse`.
- Advise the user to refresh and retry after refetching the latest `updated_at` value.

### 7.4 Database Trigger Errors (400)

**Trigger Conditions:**

- Attempt to set NULL or empty value for default locale (prevented by `validate_translation_default_locale_insert_trigger`)

**Handling:**

- Catch PostgreSQL RAISE EXCEPTION from trigger
- Return 400 with specific message: "Default locale value cannot be empty"

### 7.5 Not Found Errors (404)

**Trigger Conditions:**

- Translation record doesn't exist for (project_id, key_id, locale) combination
- Project ID doesn't exist
- Key ID doesn't exist
- Locale doesn't exist in project
- RLS policy denies access (appears as not found)

**Handling:**

- When the fetch returns no row and no DB error, respond with `404` via `createApiErrorResponse('Translation not found')`.
- Avoid leaking existence; unify unauthorized and missing as not-found where appropriate.

### 7.6 Server Errors (500)

**Trigger Conditions:**

- Database connection failure
- Unexpected database constraint violation
- Trigger execution error
- Network timeout

**Handling:**

- Log full error details to console (development)
- Return generic message to user: "An unexpected error occurred. Please try again."
- Do not expose internal error details to client

## 8. Performance Considerations

**Note:** Bulk operations are handled by translation jobs and do not use client-side caching strategies or hooks.

### 8.1 Query Optimization

**Indexing:**

- Composite primary key index on `(project_id, key_id, locale)` (auto-created)
- Foreign key index on `key_id` for cascade operations
- Foreign key index on `(project_id, locale)` for efficient filtering
- Indexes defined in `supabase/migrations/20251013143200_create_indexes.sql`

**Single Record Lookups:**

- Use composite primary key for O(1) lookup performance
- `.maybeSingle()` prevents over-fetching for single records
- Direct key-based access is highly efficient

### 8.2 Caching Strategy

**Simplified Approach:**

The implementation uses inline query keys without structured key factories. This simplifies the codebase while maintaining effective caching through TanStack Query's default behavior.

**Cache Invalidation:**

- Update translation → invalidate single translation cache (`['translation', projectId, keyId, locale]`)
- Update translation → invalidate per-language key view cache for that locale (`['keys', 'per-language', projectId, locale]`)
- Update translation → invalidate default key view cache (`['keys', 'default', projectId]`)
- Bulk update → invalidate per-language key view cache for target locale

**Query Keys:**

- Single translation: `['translation', projectId, keyId, locale]`
- Use inline query keys for simplified caching without structured key factories

### 8.3 Optimistic Updates

**Simplified Approach:**

Optimistic updates have been removed to simplify the implementation. All mutations rely on server confirmation before updating the UI, ensuring data consistency without complex rollback logic.

### 8.4 Database Performance

**Update Operations:**

- Primary key updates are highly efficient
- Triggers execute quickly for validation and trimming
- RLS policy checks use indexed foreign key relationships

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

- Create `src/features/translations/api` to host hooks, schemas, key factory, and error utilities.

### Step 2: Create Translations Constants

- Add `src/shared/constants/translations.constants.ts` defining `TRANSLATIONS_UPDATE_SOURCE_VALUES`, PG error codes, constraint names, and shared error messages.
- Re-export value limits from keys (e.g., `TRANSLATION_VALUE_MAX_LENGTH`, `TRANSLATION_VALUE_MIN_LENGTH`) to keep validation aligned across features.

### Step 3: Create Zod Validation Schemas

Create `src/features/translations/api/translations.schemas.ts` with all validation schemas defined in section 3.2.

### Step 4: Create Error Handling Utilities

- Add `translations.errors.ts` with `createDatabaseErrorResponse` mapping PG errors to `ApiErrorResponse` using shared constants.
- Handle trigger violations (default locale), check and foreign key violations, authorization hints, and generic database failures consistently.

### Step 5: Create TanStack Query Hooks

- `useTranslation(projectId, keyId, locale)` validates inputs (`GET_TRANSLATION_QUERY_SCHEMA`), fetches a single row, returns `null` when absent, and caches under inline query key `['translation', projectId, keyId, locale]`.
- `useUpdateTranslation()` accepts all parameters in the mutation payload (`project_id`, `key_id`, `locale`, optional `updated_at`, and body fields), validates body using `UPDATE_TRANSLATION_REQUEST_BODY_SCHEMA`, applies optional `updated_at` for optimistic locking, and invalidates detail and related key view caches (both per-language and default views) on settle.

### Step 6: Create API Index File

- Export `translations.errors`, `translations.schemas`, and both hooks from `api/index.ts` for ergonomic imports.

### Step 8: Write Unit Tests

**Testing Strategy:**

- Use Vitest with Testing Library for all tests
- Co-locate tests with source files (`Hook.test.ts` next to `Hook.ts`)
- Mock Supabase client using test utilities
- Test both success and error scenarios comprehensively
- Verify cache behavior
- Aim for 90% coverage threshold

**8.1 Create `src/features/translations/api/useTranslation/useTranslation.test.ts`:**

Test scenarios:

- Successful translation fetch with full metadata
- Translation not found (returns null, not error) - **Edge case: null handling**
- Validation error for invalid project/key/locale ID
- Authorization error (403)
- Database error handling
- Cache behavior verification
- **Performance test: multiple concurrent fetches**
- **Edge case: malformed UUID parameters**

**8.2 Create `src/features/translations/api/useUpdateTranslation/useUpdateTranslation.test.ts`:**

Test scenarios:

- Successful translation update
- Optimistic locking success (with updated_at)
- Optimistic locking failure (409 conflict) - **Critical: concurrent edit handling**
- Validation error (empty value for default locale)
- Validation error (value too long, contains newlines)
- Translation not found (404)
- Authorization error (403)
- Cache invalidation verification
- **Edge case: network timeout during update**
- **Edge case: partial update with mixed validation errors**
