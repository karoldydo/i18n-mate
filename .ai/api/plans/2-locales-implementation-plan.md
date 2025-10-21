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

**Example Request:**

```http
GET /rest/v1/rpc/list_project_locales_with_default?p_project_id=550e8400-e29b-41d4-a716-446655440000
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

**Alternative (Legacy):** Simple `POST /rest/v1/project_locales` is still available but **DEPRECATED**. Use atomic approach for production due to better verification and error handling. Legacy endpoint will be removed in v1.0.

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
  p_project_id: string;
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

**Note:** The implementation relies on shared constants (`LOCALE_ERROR_MESSAGES`, `LOCALE_LABEL_MAX_LENGTH`, `LOCALE_NORMALIZATION`) to stay aligned with database constraints and normalization rules.

```typescript
import { z } from 'zod';
import { LOCALE_ERROR_MESSAGES, LOCALE_LABEL_MAX_LENGTH, LOCALE_NORMALIZATION } from '@/shared/constants';

// locale code validation (bcp-47 format: ll or ll-cc)
const LOCALE_CODE_SCHEMA = z.string().refine((value) => LOCALE_NORMALIZATION.isValidFormatClient(value), {
  message: LOCALE_ERROR_MESSAGES.INVALID_FORMAT,
});

// locale label validation
const LOCALE_LABEL_SCHEMA = z
  .string()
  .min(1, LOCALE_ERROR_MESSAGES.LABEL_REQUIRED)
  .max(LOCALE_LABEL_MAX_LENGTH, LOCALE_ERROR_MESSAGES.LABEL_TOO_LONG)
  .trim();

// list project locales with default schema
export const LIST_PROJECT_LOCALES_WITH_DEFAULT_SCHEMA = z.object({
  p_project_id: z.string().uuid('Invalid project ID format'),
});

// create project locale atomic request schema
export const CREATE_PROJECT_LOCALE_ATOMIC_SCHEMA = z.object({
  p_label: LOCALE_LABEL_SCHEMA,
  p_locale: LOCALE_CODE_SCHEMA,
  p_project_id: z.string().uuid('Invalid project ID format'),
});

// update project locale schema
export const UPDATE_PROJECT_LOCALE_SCHEMA = z
  .object({
    label: LOCALE_LABEL_SCHEMA.optional(),
    // prevent immutable field modification
    locale: z.never().optional(),
  })
  .strict();

// UUID schema
export const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

// project locale response schema
export const PROJECT_LOCALE_RESPONSE_SCHEMA = z.object({
  created_at: z.string(),
  id: z.string().uuid(),
  label: z.string(),
  locale: z.string(),
  project_id: z.string().uuid(),
  updated_at: z.string(),
});

// project locale with default flag schema
export const PROJECT_LOCALE_WITH_DEFAULT_SCHEMA = PROJECT_LOCALE_RESPONSE_SCHEMA.extend({
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

**Response Format Guidelines:**

- **Single object format**: Creation endpoints return the newly created object directly
- PostgREST returns a single object for INSERT operations with `.single()` or when using `Accept: application/vnd.pgrst.object+json` header
- No wrapper object for creation responses (only list endpoints use `{ data, metadata }` format)

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

Update operations return the updated single object (no array wrapper):

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
12. TanStack Query invalidates project locales cache
13. Component displays success message and updated locale list

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
10. TanStack Query updates cache and invalidates related queries via `LOCALES_KEYS`
11. Component displays success message

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
10. TanStack Query invalidates project locales cache via `LOCALES_KEYS`
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
- Fan-out trigger failure (`fanout_translation_locale_insert_trigger`)
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

- `fanout_translation_locale_insert_trigger` uses single INSERT with SELECT
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

### Step 2: Create Locales Constants

Create `src/shared/constants/locale.constants.ts` with centralized constants, patterns, and utilities:

```typescript
/**
 * Locale Constants and Validation Patterns
 *
 * Centralized definitions for locale validation patterns to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL domain constraints.
 *
 * All patterns follow BCP-47 subset: ll or ll-CC format only.
 */

import type { LocaleCode } from '@/shared/types';

/**
 * BCP-47 locale pattern - matches ll or ll-CC format only
 * Examples: en, en-US, pl, pl-PL, es, es-ES
 *
 * Pattern breakdown:
 * - ^[a-z]{2} : exactly 2 lowercase letters (language code)
 * - (-[A-Z]{2})? : optionally followed by dash and 2 uppercase letters (country code)
 * - $ : end of string
 *
 * Note: This pattern expects normalized input (language lowercase, country uppercase)
 */
export const LOCALE_CODE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

/**
 * Raw locale pattern for input validation (before normalization)
 * Accepts mixed case input that will be normalized by database triggers
 * Examples: en, EN, en-us, EN-US, En-Us
 */
export const LOCALE_CODE_INPUT_PATTERN = /^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/;

/**
 * PostgreSQL domain constraint pattern (used in migrations)
 * Must match LOCALE_CODE_PATTERN exactly for consistency
 */
export const LOCALE_CODE_DOMAIN_PATTERN = '^[a-z]{2}(-[A-Z]{2})?$';

/**
 * Maximum length for locale code (BCP-47 ll-CC format)
 */
export const LOCALE_CODE_MAX_LENGTH = 5;

/**
 * Maximum length for locale label (human-readable name)
 */
export const LOCALE_LABEL_MAX_LENGTH = 64;

/**
 * PostgreSQL error codes relevant to locales operations
 */
export const LOCALES_PG_ERROR_CODES = {
  /** Check constraint violation */
  CHECK_VIOLATION: '23514',
  /** Foreign key violation */
  FOREIGN_KEY_VIOLATION: '23503',
  /** Unique constraint violation */
  UNIQUE_VIOLATION: '23505',
} as const;

/**
 * Database constraint names for locales
 */
export const LOCALES_CONSTRAINTS = {
  PROJECT_ID_FKEY: 'project_locales_project_id_fkey',
  UNIQUE_PER_PROJECT: 'project_locales_unique_per_project',
} as const;

/**
 * Locale normalization patterns and utilities
 */
export const LOCALE_NORMALIZATION = {
  /**
   * Client-side locale validation (matches database rules)
   * Use for immediate feedback, but always verify server-side for critical operations
   *
   * Rules implemented:
   * - Must be 2-5 characters long
   * - Format: ll or ll-CC (language-country)
   * - Only letters and one dash allowed
   * - Maximum one dash (no multiple regions)
   */
  isValidFormatClient: (locale: string): boolean => {
    if (!locale || typeof locale !== 'string') return false;
    if (locale.length > LOCALE_CODE_MAX_LENGTH) return false;
    if (!LOCALE_CODE_INPUT_PATTERN.test(locale)) return false;
    if (/.*-.*-.*/.test(locale)) return false; // Max one dash
    return true;
  },

  /** Pattern for language-country format (needs normalization) */
  LANGUAGE_COUNTRY: /^([a-zA-Z]{2})-([a-zA-Z]{2})$/,

  /** Pattern for language-only format */
  LANGUAGE_ONLY: /^[a-zA-Z]{2}$/,

  /**
   * Normalize function (TypeScript implementation)
   * Converts locale to database format: language lowercase, region uppercase
   * Examples: "en-us" -> "en-US", "PL" -> "pl", "EN-GB" -> "en-GB"
   */
  normalize: (locale: string): string => {
    if (!locale) return locale;

    if (LOCALE_NORMALIZATION.LANGUAGE_COUNTRY.test(locale)) {
      const match = locale.match(LOCALE_NORMALIZATION.LANGUAGE_COUNTRY);
      if (match) {
        const [, lang, country] = match;
        return `${lang.toLowerCase()}-${country.toUpperCase()}`;
      }
    }
    if (LOCALE_NORMALIZATION.LANGUAGE_ONLY.test(locale)) {
      return locale.toLowerCase();
    }
    return locale; // Return as-is if doesn't match expected patterns
  },
};

/**
 * Error messages for locale validation
 */
export const LOCALE_ERROR_MESSAGES = {
  ALREADY_EXISTS: 'Locale already exists for this project',
  INVALID_FORMAT: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
  LABEL_REQUIRED: 'Locale label is required',
  LABEL_TOO_LONG: `Locale label must be at most ${LOCALE_LABEL_MAX_LENGTH} characters`,
  TOO_LONG: `Locale code must be at most ${LOCALE_CODE_MAX_LENGTH} characters`,

  // Database operation errors
  PROJECT_NOT_FOUND: 'Project not found or access denied',
  LOCALE_NOT_FOUND: 'Locale not found or access denied',
  DEFAULT_LOCALE_IMMUTABLE: 'Cannot delete default locale',

  // Generic errors
  DATABASE_ERROR: 'Database operation failed',
  NO_DATA_RETURNED: 'No data returned from server',
  INVALID_FIELD_VALUE: 'Invalid field value',
  REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource not found',
} as const;

/**
 * Locale validation patterns and utilities
 */
export const LOCALE_VALIDATION = {
  /**
   * Validate locale label format
   * Checks length constraints
   */
  isValidLocaleLabel: (label: string): boolean => {
    if (!label || typeof label !== 'string') return false;
    const trimmed = label.trim();
    if (trimmed.length < 1 || trimmed.length > LOCALE_LABEL_MAX_LENGTH) return false;
    return true;
  },

  /**
   * Check if locale code is valid (normalized format)
   */
  isValidLocaleCode: (locale: string): boolean => {
    return LOCALE_CODE_PATTERN.test(locale) && locale.length <= LOCALE_CODE_MAX_LENGTH;
  },
};

/**
 * Creates a branded LocaleCode from a string with validation
 * Throws error if locale is invalid
 */
export function createLocaleCode(locale: string): LocaleCode {
  const normalized = LOCALE_NORMALIZATION.normalize(locale);
  if (!LOCALE_VALIDATION.isValidLocaleCode(normalized)) {
    throw new Error(LOCALE_ERROR_MESSAGES.INVALID_FORMAT);
  }
  return normalized as LocaleCode;
}

/**
 * Type guard that also serves as type assertion for LocaleCode
 */
export function isLocaleCode(locale: string): locale is LocaleCode {
  return LOCALE_VALIDATION.isValidLocaleCode(locale);
}

/**
 * Type guard to check if string is a valid locale code
 */
export function isValidLocaleCode(locale: string): boolean {
  return LOCALE_VALIDATION.isValidLocaleCode(locale);
}

/**
 * Type guard to check if string could be a valid locale code (before normalization)
 */
export function isValidLocaleInput(locale: string): boolean {
  return LOCALE_CODE_INPUT_PATTERN.test(locale) && locale.length <= LOCALE_CODE_MAX_LENGTH;
}

/**
 * Sanitize and normalize locale label
 * Trims whitespace and ensures valid format
 */
export function normalizeLocaleLabel(label: string): string {
  if (!label || typeof label !== 'string') {
    throw new Error(LOCALE_ERROR_MESSAGES.LABEL_REQUIRED);
  }

  const normalized = label.trim();

  if (!LOCALE_VALIDATION.isValidLocaleLabel(normalized)) {
    throw new Error(LOCALE_ERROR_MESSAGES.LABEL_TOO_LONG);
  }

  return normalized;
}
```

Add to `src/shared/constants/index.ts`:

```typescript
export * from './locale.constants';
export * from './keys.constants';
export * from './projects.constants';
```

### Step 3: Create Zod Validation Schemas

Create `src/features/locales/api/locales.schemas.ts` with all validation schemas defined in section 3.2.

### Step 4: Create Error Handling Utilities

Create `src/features/locales/api/locales.errors.ts`:

**Note:** The implementation now uses constants from `src/shared/constants/locale.constants.ts` for error codes, constraint names, and error messages. This ensures consistency across the application.

```typescript
import type { PostgrestError } from '@supabase/supabase-js';
import type { ApiErrorResponse } from '@/shared/types';
import { createApiErrorResponse } from '@/shared/utils';
import { LOCALES_PG_ERROR_CODES, LOCALES_CONSTRAINTS, LOCALE_ERROR_MESSAGES } from '@/shared/constants';

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
  if (error.code === LOCALES_PG_ERROR_CODES.UNIQUE_VIOLATION) {
    if (error.message.includes(LOCALES_CONSTRAINTS.UNIQUE_PER_PROJECT)) {
      return createApiErrorResponse(409, LOCALE_ERROR_MESSAGES.ALREADY_EXISTS);
    }
  }

  // Handle trigger violations (default locale deletion)
  if (error.message.includes('Cannot delete default_locale')) {
    return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.DEFAULT_LOCALE_IMMUTABLE);
  }

  // Handle check constraint violations
  if (error.code === LOCALES_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, LOCALE_ERROR_MESSAGES.INVALID_FIELD_VALUE, { constraint: error.details });
  }

  // Handle foreign key violations
  if (error.code === LOCALES_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return createApiErrorResponse(404, LOCALE_ERROR_MESSAGES.PROJECT_NOT_FOUND);
  }

  // Generic database error
  return createApiErrorResponse(500, fallbackMessage || LOCALE_ERROR_MESSAGES.DATABASE_ERROR, { original: error });
}
```

### Step 5: Create Query Keys Factory

Create `src/features/locales/api/locales.key-factory.ts`:

```typescript
/**
 * Query key factory for project locales
 * Follows TanStack Query best practices for structured query keys
 */
export const LOCALES_KEYS = {
  all: ['project-locales'] as const,
  detail: (id: string) => [...LOCALES_KEYS.details(), id] as const,
  details: () => [...LOCALES_KEYS.all, 'detail'] as const,
  list: (projectId: string) => [...LOCALES_KEYS.lists(), projectId] as const,
  lists: () => [...LOCALES_KEYS.all, 'list'] as const,
};
```

**Note:** Properties are ordered alphabetically for consistency and easier code navigation.

### Step 6: Create TanStack Query Hooks

**Implementation Notes:**

- All hooks follow TanStack Query best practices with proper error handling
- Use optimistic updates for better UX in mutation hooks
- Implement cache invalidation with `LOCALES_KEYS` to target list/detail scopes
- Include TypeScript generics for type safety and locale normalization

**6.1 Create `src/features/locales/api/useProjectLocales/useProjectLocales.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { ApiErrorResponse, ProjectLocaleWithDefault } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../locales.errors';
import { LOCALES_KEYS } from '../locales.key-factory';
import { LIST_PROJECT_LOCALES_WITH_DEFAULT_SCHEMA, PROJECT_LOCALE_WITH_DEFAULT_SCHEMA } from '../locales.schemas';

export function useProjectLocales(projectId: string) {
  const supabase = useSupabase();

  return useQuery<ProjectLocaleWithDefault[], ApiErrorResponse>({
    gcTime: 30 * 60 * 1000, // 30 minutes
    queryFn: async () => {
      const { p_project_id } = LIST_PROJECT_LOCALES_WITH_DEFAULT_SCHEMA.parse({ project_id: projectId });

      const { data, error } = await supabase.rpc('list_project_locales_with_default', { p_project_id });

      if (error) {
        throw createDatabaseErrorResponse(error, 'useProjectLocales', 'Failed to fetch project locales');
      }

      if (!data) {
        throw createApiErrorResponse(500, 'No data returned from server');
      }

      return z.array(PROJECT_LOCALE_WITH_DEFAULT_SCHEMA).parse(data);
    },
    queryKey: LOCALES_KEYS.list(projectId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

**6.2 Create `src/features/locales/api/useCreateProjectLocale/useCreateProjectLocale.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  ApiErrorResponse,
  CreateProjectLocaleAtomicRequest,
  CreateProjectLocaleAtomicResponse,
} from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { LOCALE_NORMALIZATION } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

import { createAtomicLocaleErrorResponse } from '../locales.errors';
import { LOCALES_KEYS } from '../locales.key-factory';
import { CREATE_PROJECT_LOCALE_ATOMIC_SCHEMA, PROJECT_LOCALE_RESPONSE_SCHEMA } from '../locales.schemas';

export function useCreateProjectLocale(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<
    CreateProjectLocaleAtomicResponse,
    ApiErrorResponse,
    Omit<CreateProjectLocaleAtomicRequest, 'p_project_id'>
  >({
    mutationFn: async (payload) => {
      // normalize locale code before validation
      const normalized = LOCALE_NORMALIZATION.normalize(payload.p_locale);

      // validate input with normalized locale
      const { p_label, p_locale, p_project_id } = CREATE_PROJECT_LOCALE_ATOMIC_SCHEMA.parse({
        ...payload,
        p_locale: normalized,
        p_project_id: projectId,
      });

      const { data, error } = await supabase
        .rpc('create_project_locale_atomic', { p_label, p_locale, p_project_id })
        .single();

      if (error) {
        throw createAtomicLocaleErrorResponse(error, 'useCreateProjectLocale', 'Failed to add locale');
      }

      if (!data) {
        throw createApiErrorResponse(500, 'No data returned from atomic locale creation');
      }

      return PROJECT_LOCALE_RESPONSE_SCHEMA.parse(data);
    },
    onSuccess: () => {
      // invalidate project locales list cache
      queryClient.invalidateQueries({ queryKey: LOCALES_KEYS.list(projectId) });
    },
    // enhanced retry logic for atomic operations
    retry: (failureCount, error) => {
      // don't retry authentication/authorization errors
      if (error?.error?.code === 401 || error?.error?.code === 403 || error?.error?.code === 404) {
        return false;
      }

      // retry fan-out failures up to 2 times (transient issues)
      if (error?.error?.details?.code === 'FANOUT_INCOMPLETE' && failureCount < 2) {
        return true;
      }

      // retry verification failures once
      if (error?.error?.details?.code === 'FANOUT_VERIFICATION_FAILED' && failureCount < 1) {
        return true;
      }

      // don't retry conflict errors (locale already exists)
      if (error?.error?.code === 409) {
        return false;
      }

      // default retry once for other errors
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => {
      // exponential backoff with jitter, max 5 seconds
      const BASE_DELAY = 1000;
      const MAX_DELAY = 5000;
      const EXPONENTIAL_DELAY = BASE_DELAY * Math.pow(2, attemptIndex);
      const JITTER = Math.random() * 500; // add 0-500ms jitter
      return Math.min(EXPONENTIAL_DELAY + JITTER, MAX_DELAY);
    },
  });
}
```

**6.3 Create `src/features/locales/api/useUpdateProjectLocale/useUpdateProjectLocale.ts`:**

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
import { LOCALES_KEYS } from '../locales.key-factory';
import { PROJECT_LOCALE_RESPONSE_SCHEMA, UPDATE_PROJECT_LOCALE_SCHEMA, UUID_SCHEMA } from '../locales.schemas';

interface UpdateProjectLocaleContext {
  previousLocales?: ProjectLocaleWithDefault[];
}

export function useUpdateProjectLocale(projectId: string, localeId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ProjectLocaleResponse, ApiErrorResponse, UpdateProjectLocaleRequest, UpdateProjectLocaleContext>({
    mutationFn: async (payload) => {
      const id = UUID_SCHEMA.parse(localeId);
      const body = UPDATE_PROJECT_LOCALE_SCHEMA.parse(payload);

      const { data, error } = await supabase.from('project_locales').update(body).eq('id', id).select().single();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useUpdateProjectLocale', 'Failed to update locale');
      }

      if (!data) {
        throw createApiErrorResponse(404, 'Locale not found or access denied');
      }

      return PROJECT_LOCALE_RESPONSE_SCHEMA.parse(data);
    },
    onError: (_err, _newData, context) => {
      // rollback on error
      if (context?.previousLocales) {
        queryClient.setQueryData(LOCALES_KEYS.list(projectId), context.previousLocales);
      }
    },
    onMutate: async (newData) => {
      // cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: LOCALES_KEYS.list(projectId) });

      // snapshot previous value
      const PREVIOUS_LOCALES = queryClient.getQueryData<ProjectLocaleWithDefault[]>(LOCALES_KEYS.list(projectId));

      // optimistically update
      queryClient.setQueryData(LOCALES_KEYS.list(projectId), (old: ProjectLocaleWithDefault[] | undefined) => {
        // guard clause: prevent errors if cache is empty
        if (!old) return old;
        return old.map((locale) => (locale.id === localeId ? { ...locale, ...newData } : locale));
      });

      return { previousLocales: PREVIOUS_LOCALES };
    },
    onSettled: () => {
      // refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: LOCALES_KEYS.list(projectId) });
    },
  });
}
```

**6.4 Create `src/features/locales/api/useDeleteProjectLocale/useDeleteProjectLocale.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiErrorResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createDatabaseErrorResponse } from '../locales.errors';
import { LOCALES_KEYS } from '../locales.key-factory';
import { UUID_SCHEMA } from '../locales.schemas';

export function useDeleteProjectLocale(projectId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiErrorResponse, string>({
    mutationFn: async (uuid) => {
      const id = UUID_SCHEMA.parse(uuid);

      const { error } = await supabase.from('project_locales').delete().eq('id', id);

      if (error) {
        throw createDatabaseErrorResponse(error, 'useDeleteProjectLocale', 'Failed to delete locale');
      }
    },
    onSuccess: () => {
      // invalidate project locales list cache
      queryClient.invalidateQueries({ queryKey: LOCALES_KEYS.list(projectId) });
    },
  });
}
```

### Step 7: Create API Index File

Create `src/features/locales/api/index.ts`:

```typescript
export { createAtomicLocaleErrorResponse, createDatabaseErrorResponse } from './locales.errors';
export { LOCALES_KEYS } from './locales.key-factory';
export * from './locales.schemas';
export * from './useCreateProjectLocale';
export * from './useDeleteProjectLocale';
export * from './useProjectLocales';
export * from './useUpdateProjectLocale';
export { LOCALE_NORMALIZATION } from '@/shared/constants';
```

**Organization:**

- Error utilities exported together for reuse
- Query key factory centralized via `LOCALES_KEYS`
- Validation schemas barrel-exported for consistent imports
- Hook folders expose index barrels so top-level exports can use `export *`
- Locale normalization helper re-exported for API consumers

### Step 8: Write Unit Tests

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
- Verify cache invalidation
- Verify cascade delete of translations
