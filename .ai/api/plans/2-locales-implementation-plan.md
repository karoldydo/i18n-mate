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
- **URL Structure:** `/rest/v1/rpc/list_project_locales_with_default?p_project_id={project_id}`
- **Authentication:** Required (JWT via Authorization header)
- **Parameters:**
  - Required:
    - `p_project_id` (UUID) - Project ID
  - Optional: None
- **Request Body:** None

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

**Note:** All types are organized by feature in separate directories under `src/shared/types/`.

### 3.1 Existing Types

**Import Path:** `@/shared/types` (central export) or `@/shared/types/locales` (feature-specific)

**Shared Types** (from `src/shared/types/types.ts`):

- `PaginationParams` - Query parameters for pagination
- `PaginationMetadata` - Response metadata with total count
- `PaginatedResponse<T>` - Generic paginated response wrapper
- `ApiErrorResponse` - Generic error response wrapper
- `ValidationErrorResponse` - 400 validation error response
- `ConflictErrorResponse` - 409 conflict error response

**Locales Types** (from `src/shared/types/locales/index.ts`):

- `ProjectLocaleResponse` - Canonical locale row with core fields
- `ProjectLocaleWithDefault` - `ProjectLocaleResponse` plus `is_default` flag
- `CreateProjectLocaleRequest` - Input for atomic locale creation
- `CreateProjectLocaleResponse` - Result of locale creation
- `UpdateProjectLocaleRequest` - Input for locale label updates
- `ListProjectLocalesWithDefaultArgs` - Parameters for locale listing RPC

### 3.2 New Zod Validation Schemas

Create validation schemas in `src/features/locales/api/locales.schemas.ts`:

**Note:** The implementation relies on shared constants (`LOCALE_ERROR_MESSAGES`, `LOCALE_LABEL_MAX_LENGTH`, `LOCALE_NORMALIZATION`) to stay aligned with database constraints and normalization rules.

- Define schemas in `src/features/locales/api/locales.schemas.ts` using shared constants for consistency with DB.
- `LOCALE_CODE_SCHEMA` validates BCP‑47 subset and uses `LOCALE_NORMALIZATION.isValidFormatClient`.
- `LOCALE_LABEL_SCHEMA` trims and bounds label length with `LOCALE_LABEL_MAX_LENGTH` and `LOCALE_ERROR_MESSAGES`.
- `LIST_PROJECT_LOCALES_WITH_DEFAULT_SCHEMA` enforces a UUID `p_project_id`.
- `CREATE_PROJECT_LOCALE_ATOMIC_SCHEMA` validates `p_label`, `p_locale`, and `p_project_id` for RPC.
- `UPDATE_PROJECT_LOCALE_SCHEMA` is strict, allowing `label` only and rejecting `locale` via `z.never()`.
- `UUID_SCHEMA` standardizes identifier validation.
- `PROJECT_LOCALE_RESPONSE_SCHEMA` and `PROJECT_LOCALE_WITH_DEFAULT_SCHEMA` validate list/create results at runtime.

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
3. Hook normalizes the locale code and validates payload using `CREATE_PROJECT_LOCALE_ATOMIC_SCHEMA`
4. If validation fails, return 400 error immediately
5. Hook calls Supabase RPC `create_project_locale_atomic` with validated payload
6. RPC function performs insert + translation fan-out inside a single transaction
7. Fan-out verification ensures expected translation count; failures map to 500 with detailed codes
8. Unique constraint violations propagate as 409 Conflict responses
9. Successful execution returns the new locale row
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
12. Component displays success message and updated locale list

### 5.3 Update Locale Label Flow

1. User submits locale label update form
2. `useUpdateProjectLocale` mutation hook receives locale ID and update data
3. Hook validates data using `UPDATE_PROJECT_LOCALE_SCHEMA` (ensures no immutable fields)
4. Hook validates locale ID using `UUID_SCHEMA`
5. Hook calls Supabase `.update()` with validated data and `.eq('id', localeId)`
6. RLS policy validates ownership via project relationship
7. If unauthorized or not found, Supabase returns empty result → hook returns 404
8. Database trigger `update_project_locales_updated_at` updates `updated_at` timestamp
9. On success, updated locale data is returned
10. Component displays success message

### 5.4 Delete Locale Flow

1. User confirms locale deletion
2. `useDeleteProjectLocale` mutation hook receives locale ID
3. Hook validates UUID format using `UUID_SCHEMA`
4. Hook calls Supabase `.delete().eq('id', localeId)`
5. Database trigger `prevent_project_locale_default_delete_trigger` checks if locale is default:
   - Queries projects table to find default_locale
   - If locale matches default_locale, raises exception → hook returns 400
6. RLS policy validates ownership via project relationship
7. If unauthorized or not found, returns 404
8. PostgreSQL CASCADE DELETE removes all related data:
   - `translations` rows for this locale
9. On success, Supabase returns 204 No Content
10. Component displays success message and updated locale list

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
- **Locale normalization:** Database trigger (`normalize_project_locale_insert_trigger`) normalizes locale codes to ll or ll-CC format
- **Immutability enforcement:** Client-side strict schema prevents modification of `locale` field
- **Default locale protection:** Database trigger (`prevent_project_locale_default_delete_trigger`) prevents deletion
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

- Convert Zod issues into standardized `ApiErrorResponse` via `createApiErrorResponse` at hook boundaries.
- Prevent backend calls on known-invalid input by validating early with `zod` schemas.

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

• Map `23505` on `project_locales_unique_per_project` to 409 using `createDatabaseErrorResponse` with a clear message.
• Skip retries on conflicts; prompt user to choose a different `locale`.

### 7.4 Database Trigger Errors (400)

**Trigger Conditions:**

- Attempt to delete default locale (prevented by `prevent_project_locale_default_delete_trigger`)

**Handling:**

- Catch PostgreSQL RAISE EXCEPTION from trigger
- Return 400 with specific message: "Cannot delete default locale" (trigger: `prevent_project_locale_default_delete_trigger`)

### 7.5 Not Found Errors (404)

**Trigger Conditions:**

- Locale ID doesn't exist
- Project ID doesn't exist
- RLS policy denies access (appears as not found)

**Handling:**

- If an operation yields no row, return 404 via `createApiErrorResponse(404, 'Locale not found or access denied')`.
- Treat RLS denials as 404 to avoid leaking resource existence.

### 7.6 Server Errors (500)

**Trigger Conditions:**

- Database connection failure
- RPC function execution error
- Fan-out trigger failure (`fanout_translation_locale_insert_trigger`)
- Cascade delete failure

**Handling:**

- Log full error details to console (development)
- Return generic message to user: "An unexpected error occurred. Please try again."
- Do not expose internal error details to client

• Normalize unknown server errors to 500 using `createDatabaseErrorResponse` with a safe fallback message.
• Log detailed context in development; never expose internal details in client-facing messages.

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

**Simplified Approach:**

The implementation uses inline query keys without structured key factories. This simplifies the codebase while maintaining effective caching through TanStack Query's default behavior.

**Query Keys:**

- Project locales list: `['project-locales', projectId]`

### 8.3 Optimistic Updates

**Simplified Approach:**

Optimistic updates have been removed to simplify the implementation. All mutations rely on server confirmation before updating the UI, ensuring data consistency without complex rollback logic.

### 8.5 Database Performance

**Fan-Out Trigger Optimization:**

- `fanout_translation_locale_insert_trigger` uses single INSERT with SELECT
- Efficient for projects with many keys (batch insert vs. N individual inserts)
- Trigger uses `SECURITY DEFINER` to bypass RLS during fan-out

**Cascade Delete Optimization:**

- CASCADE DELETE on translations is efficient due to composite primary key index
- Index on `(project_id, key_id, locale)` ensures fast deletion

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

- Create `src/features/locales/api` and subfolders for hooks and barrels.

### Step 2: Create Locales Constants

Create `src/shared/constants/locale.constants.ts` with centralized constants, patterns, and utilities:

- Provide `LOCALE_CODE_PATTERN`, `LOCALE_CODE_INPUT_PATTERN`, and `LOCALE_CODE_DOMAIN_PATTERN` aligned with DB domains.
- Expose `LOCALE_CODE_MAX_LENGTH` and `LOCALE_LABEL_MAX_LENGTH` reflecting UI and DB limits.
- Implement `LOCALE_NORMALIZATION` with `isValidFormatClient` and `normalize` to mirror server normalization.
- Define `LOCALE_ERROR_MESSAGES` for consistent validation messages across UI and schemas.

Add to `src/shared/constants/index.ts`:

- Re-export `./locale.constants` (and existing feature constants) to keep imports consistent.

### Step 3: Create Zod Validation Schemas

Create `src/features/locales/api/locales.schemas.ts` with all validation schemas defined in section 3.2.

### Step 4: Create Error Handling Utilities

Create `src/features/locales/api/locales.errors.ts`:

**Note:** The implementation now uses constants from `src/shared/constants/locale.constants.ts` for error codes, constraint names, and error messages. This ensures consistency across the application.

- Provide `createDatabaseErrorResponse` to normalize Postgres errors: map `23505` → 409, `23514` → 400, `23503` → 404, triggers → 400.
- Use `createApiErrorResponse` for generic 500s with safe fallback; accept optional `context` for structured logs.

### Step 5: Create TanStack Query Hooks

**Implementation Notes:**

- Hooks follow TanStack Query best practices with proper error handling and runtime validation.
- Use inline query keys for simplified caching without structured key factories.
- Include TypeScript generics for type safety and locale normalization

**6.1 Create `src/features/locales/api/useProjectLocales/useProjectLocales.ts`:**

- Validate `projectId` with `LIST_PROJECT_LOCALES_WITH_DEFAULT_SCHEMA`, call RPC `list_project_locales_with_default`, parse with `PROJECT_LOCALE_WITH_DEFAULT_SCHEMA`.
- Use simple query key `['project-locales', projectId]` with default TanStack Query caching behavior.

**6.2 Create `src/features/locales/api/useCreateProjectLocale/useCreateProjectLocale.ts`:**

- Normalize `p_locale` via `LOCALE_NORMALIZATION.normalize`, validate payload with `CREATE_PROJECT_LOCALE_ATOMIC_SCHEMA`, call RPC, parse with `PROJECT_LOCALE_RESPONSE_SCHEMA`.
- Implement exponential backoff retry logic for transient fan-out issues (up to 2 retries for `FANOUT_INCOMPLETE`, 1 retry for `FANOUT_VERIFICATION_FAILED`), skip retries for authentication/authorization/conflict errors (401/403/404/409).

**6.3 Create `src/features/locales/api/useUpdateProjectLocale/useUpdateProjectLocale.ts`:**

- Validate `localeId` with `UUID_SCHEMA` and payload with `UPDATE_PROJECT_LOCALE_SCHEMA`; update by `id` and parse with `PROJECT_LOCALE_RESPONSE_SCHEMA`.

**6.4 Create `src/features/locales/api/useDeleteProjectLocale/useDeleteProjectLocale.ts`:**

- Validate `uuid` with `UUID_SCHEMA`, perform delete, and map DB errors with `createDatabaseErrorResponse`.

### Step 6: Create API Index File

Create `src/features/locales/api/index.ts`:

- Export `createAtomicLocaleErrorResponse`, `createDatabaseErrorResponse`, all schemas, and hooks.
- Re-export `LOCALE_NORMALIZATION` from shared constants for consumers needing client-side normalization.

**Organization:**

- Error utilities exported together for reuse
- Validation schemas barrel-exported for consistent imports
- Hook folders expose index barrels so top-level exports can use `export *`
- Locale normalization helper re-exported for API consumers

### Step 7: Write Unit Tests

**Testing Strategy:**

- Use Vitest with Testing Library for comprehensive test coverage
- Co-locate tests with source files (`Hook.test.ts` next to `Hook.ts`)
- Mock Supabase client using test utilities from `src/test/`
- Test both success and error scenarios with locale-specific edge cases
- Verify cache behavior, RPC functionality, and locale normalization
- Aim for 90% coverage threshold as per project requirements

**8.1 Create `src/features/locales/api/useProjectLocales/useProjectLocales.test.ts`:**

Test scenarios:

- Successful list fetch with default locale flag
- Empty results (new project with only default locale)
- Validation error for invalid project ID (not UUID)
- Database error handling
- Multiple locales with correct is_default flags
- RLS access denied (appears as database error)

**8.2 Create `src/features/locales/api/useCreateProjectLocale/useCreateProjectLocale.test.ts`:**

Test scenarios:

- Successful locale creation with normalization (en-us → en-US)
- Validation error (invalid locale format)
- Validation error (empty label)
- Validation error (label too long > 64 chars)
- Duplicate locale conflict (409)
- Database error (project not found)
- Fan-out trigger execution (verify translations created)

**8.3 Create `src/features/locales/api/useUpdateProjectLocale/useUpdateProjectLocale.test.ts`:**

Test scenarios:

- Successful update (label only)
- Optimistic update and rollback on error
- Attempt to change locale (400 - blocked by strict schema)
- Locale not found (404)
- Empty label (400)
- Label too long > 64 chars (400)

**8.4 Create `src/features/locales/api/useDeleteProjectLocale/useDeleteProjectLocale.test.ts`:**

Test scenarios:

- Successful deletion (non-default locale)
- Attempt to delete default locale (400 - trigger prevents)
- Invalid UUID format
- Locale not found (404)
- Verify cascade delete of translations
