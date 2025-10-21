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

**Example Request:**

```http
GET /rest/v1/translations?project_id=eq.550e8400-e29b-41d4-a716-446655440000&key_id=eq.660e8400-e29b-41d4-a716-446655440001&locale=eq.pl
Authorization: Bearer {access_token}
```

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

Include `updated_at` in WHERE clause to prevent lost updates:

```http
PATCH /rest/v1/translations?project_id=eq.{project_id}&key_id=eq.{key_id}&locale=eq.{locale}&updated_at=eq.{timestamp}
```

If no rows are affected (0 matches), return 409 Conflict and client must refetch.

## 3. Used Types

### 3.1 Existing Types (from `src/shared/types/types.ts`)

```typescript
// Response DTOs
export type TranslationResponse = Translation;

// Request DTOs
export type UpdateTranslationRequest = Pick<
  TranslationUpdate,
  'is_machine_translated' | 'updated_by_user_id' | 'updated_source' | 'value'
>;

// Database types (from database.types.ts)
export type Translation = Tables<'translations'>;
export type TranslationUpdate = TablesUpdate<'translations'>;

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

Create validation schemas in `src/features/translations/api/translations.schemas.ts`:

**Note:** The implementation uses constants from `src/shared/constants/translations.constants.ts` for validation parameters, error messages, and patterns. This ensures consistency between client-side validation and database constraints.

```typescript
import { z } from 'zod';

import {
  TRANSLATION_VALUE_MAX_LENGTH,
  TRANSLATION_VALUE_MIN_LENGTH,
  TRANSLATIONS_ERROR_MESSAGES,
  TRANSLATIONS_UPDATE_SOURCE_VALUES,
} from '@/shared/constants';
import type { TranslationResponse, UpdateTranslationRequest } from '@/shared/types';

// translation value validation (same as used in keys)
const TRANSLATION_VALUE_SCHEMA = z
  .string()
  .min(TRANSLATION_VALUE_MIN_LENGTH, TRANSLATIONS_ERROR_MESSAGES.VALUE_REQUIRED)
  .max(TRANSLATION_VALUE_MAX_LENGTH, TRANSLATIONS_ERROR_MESSAGES.VALUE_TOO_LONG)
  .refine((value) => !value.includes('\\n'), TRANSLATIONS_ERROR_MESSAGES.VALUE_NO_NEWLINES)
  .transform((value) => value.trim());

// locale code validation (bcp-47 format)
const LOCALE_CODE_SCHEMA = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// uuid validation schemas
const PROJECT_ID_SCHEMA = z.string().uuid('Invalid project ID format');
const KEY_ID_SCHEMA = z.string().uuid('Invalid key ID format');
const USER_ID_SCHEMA = z.string().uuid('Invalid user ID format');

// update source validation
const UPDATE_SOURCE_SCHEMA = z.enum(TRANSLATIONS_UPDATE_SOURCE_VALUES, {
  errorMap: () => ({ message: 'Update source must be "user" or "system"' }),
});

// get translation query schema
export const GET_TRANSLATION_QUERY_SCHEMA = z.object({
  key_id: KEY_ID_SCHEMA,
  locale: LOCALE_CODE_SCHEMA,
  project_id: PROJECT_ID_SCHEMA,
}) satisfies z.ZodType<Pick<TranslationResponse, 'key_id' | 'locale' | 'project_id'>>;

// update translation request schema
export const UPDATE_TRANSLATION_REQUEST_SCHEMA = z.object({
  is_machine_translated: z.boolean(),
  updated_by_user_id: USER_ID_SCHEMA.nullable(),
  updated_source: UPDATE_SOURCE_SCHEMA,
  value: TRANSLATION_VALUE_SCHEMA,
}) satisfies z.ZodType<UpdateTranslationRequest>;

// update translation query schema (with optimistic locking)
export const UPDATE_TRANSLATION_QUERY_SCHEMA = GET_TRANSLATION_QUERY_SCHEMA.extend({
  updated_at: z.string().datetime(), // iso 8601 timestamp for optimistic locking
}) satisfies z.ZodType<
  Partial<Pick<TranslationResponse, 'updated_at'>> & Pick<TranslationResponse, 'key_id' | 'locale' | 'project_id'>
>;

// response schemas for runtime validation
export const TRANSLATION_RESPONSE_SCHEMA =
  z
    .object({
      is_machine_translated: z.boolean(),
      key_id: KEY_ID_SCHEMA,
      locale: LOCALE_CODE_SCHEMA,
      project_id: PROJECT_ID_SCHEMA,
      updated_at: z.string(),
      updated_by_user_id: USER_ID_SCHEMA.nullable(),
      updated_source: UPDATE_SOURCE_SCHEMA,
      value: z.string().nullable(),
    })
    satisfies z.ZodType<TranslationResponse>;
```

## 4. Response Details

### 4.1 Get Translation

**Success Response (200 OK):**

**Response Format Guidelines:**

- **Array format**: Used for list endpoints or when expecting multiple results
- **Single object format**: Used when fetching translation details by specific ID/combination using `.maybeSingle()` or `Accept: application/vnd.pgrst.object+json` header

PostgREST returns an array by default:

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

**Single Object Response (with .maybeSingle()):**

When using Supabase client with `.maybeSingle()` or REST with `Accept: application/vnd.pgrst.object+json` header.

**Use Cases:**

- **Array format**: For list views, search results, bulk operations
- **Single object format**: For translation details, inline editing, specific translation fetching by unique composite key

Response body:

```json
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
```

### 4.2 Update Translation (Inline Edit)

**Success Response (200 OK):**

Update operations return the updated single object (no array wrapper):

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

1. User edits translation value in inline editor
2. `useUpdateTranslation` mutation hook receives new value and metadata
3. Hook validates data using `UPDATE_TRANSLATION_REQUEST_SCHEMA`
4. Hook validates query params using `UPDATE_TRANSLATION_QUERY_SCHEMA`
5. Hook calls Supabase `.update(validatedData).eq('project_id', projectId).eq('key_id', keyId).eq('locale', locale)`
6. If optimistic locking is enabled, adds `.eq('updated_at', timestamp)` to WHERE clause
7. Database trigger `trim_translation_value_insert_trigger` auto-trims value and converts empty to NULL
8. Database trigger `validate_translation_default_locale_insert_trigger` prevents NULL for default locale
9. RLS policy validates project ownership
10. If optimistic lock fails (0 rows affected), hook returns 409
11. If unauthorized or not found, hook returns 404
12. On success, updated translation data is returned
13. TanStack Query updates cache with optimistic update
14. Component displays success feedback

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

Zod validation errors are automatically converted to ApiErrorResponse format by the global QueryClient error handler configured in `src/app/config/queryClient/queryClient.ts`. This ensures consistent error format across all queries and mutations without requiring try/catch blocks in individual hooks.

**Result Format:**

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

```typescript
const { count, error } = await supabase
  .from('translations')
  .update(validatedData)
  .eq('project_id', projectId)
  .eq('key_id', keyId)
  .eq('locale', locale)
  .eq('updated_at', optimisticTimestamp);

if (count === 0 && !error) {
  throw createApiErrorResponse(409, 'Translation was modified by another user. Please refresh and try again.');
}
```

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

```typescript
import { createApiErrorResponse } from '@/shared/utils';

const { data, error } = await supabase
  .from('translations')
  .select('*')
  .eq('project_id', projectId)
  .eq('key_id', keyId)
  .eq('locale', locale)
  .maybeSingle();

if (!data && !error) {
  throw createApiErrorResponse(404, 'Translation not found');
}
```

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

**Example:**

```typescript
const { data, error } = await supabase
  .from('translations')
  .update(validatedData)
  .eq('project_id', projectId)
  .eq('key_id', keyId)
  .eq('locale', locale);

if (error) {
  throw createDatabaseErrorResponse(error, 'useUpdateTranslation', 'Failed to update translation');
}
```

## 8. Performance Considerations

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

**TanStack Query Configuration:**

```typescript
// Single translation: 5-minute cache
staleTime: 5 * 60 * 1000,
gcTime: 15 * 60 * 1000,

// Bulk operations: no caching (mutations only)
// Caching handled by invalidation of related queries
```

**Cache Invalidation:**

- Update translation → invalidate single translation cache
- Update translation → invalidate per-language key view cache for that locale
- Bulk update → invalidate per-language key view cache for target locale
- Use specific cache keys for fine-grained invalidation

**Cache Keys:**

- Single translation: `['translations', projectId, keyId, locale]`
- Use structured query keys for precise invalidation

**Note:** Bulk update operations are handled internally by translation jobs and do not use client-side caching strategies.

### 8.3 Optimistic Updates

**Single Translation Update:**

```typescript
const updateMutation = useMutation({
  mutationFn: updateTranslation,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['translations', projectId, keyId, locale] });

    // Snapshot previous value
    const previousTranslation = queryClient.getQueryData(['translations', projectId, keyId, locale]);

    // Optimistically update
    queryClient.setQueryData(['translations', projectId, keyId, locale], (old) => ({ ...old, ...newData }));

    return { previousTranslation };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['translations', projectId, keyId, locale], context.previousTranslation);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['translations', projectId, keyId, locale] });
    // Also invalidate key lists that show this translation
    queryClient.invalidateQueries({ queryKey: ['keys', 'per-language', projectId, locale] });
  },
});
```

### 8.4 Database Performance

**Update Operations:**

- Primary key updates are highly efficient
- Triggers execute quickly for validation and trimming
- RLS policy checks use indexed foreign key relationships

**Note:** Bulk operations are handled by translation jobs using direct database operations, not exposed as client hooks.

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

```bash
mkdir -p src/features/translations/api
```

### Step 2: Create Translations Constants

Create `src/shared/constants/translations.constants.ts` with centralized constants, patterns, and utilities:

**Note:** This step creates centralized constants that ensure consistency between TypeScript validation (Zod schemas) and PostgreSQL domain constraints for translations.

```typescript
/**
 * Translations Constants and Validation Patterns
 *
 * Centralized definitions for translation validation patterns to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL domain constraints.
 */

// Re-export translation value constraints from keys constants for consistency
import { TRANSLATION_VALUE_MAX_LENGTH, TRANSLATION_VALUE_MIN_LENGTH } from './keys.constants';

export { TRANSLATION_VALUE_MAX_LENGTH, TRANSLATION_VALUE_MIN_LENGTH };

// Update source values
export const TRANSLATIONS_UPDATE_SOURCE_VALUES = ['user', 'system'] as const;

// PostgreSQL error codes relevant to translations
export const TRANSLATIONS_PG_ERROR_CODES = {
  /** Check constraint violation */
  CHECK_VIOLATION: '23514',
  /** Foreign key violation */
  FOREIGN_KEY_VIOLATION: '23503',
  /** Unique constraint violation */
  UNIQUE_VIOLATION: '23505',
} as const;

// Database constraint names for translations
export const TRANSLATIONS_CONSTRAINTS = {
  KEY_ID_FKEY: 'translations_key_id_fkey',
  PRIMARY_KEY: 'translations_pkey',
  PROJECT_ID_FKEY: 'translations_project_id_fkey',
  PROJECT_LOCALE_FKEY: 'translations_project_id_locale_fkey',
} as const;

// Error messages for translations validation
export const TRANSLATIONS_ERROR_MESSAGES = {
  DATABASE_ERROR: 'Database operation failed',
  DEFAULT_LOCALE_EMPTY: 'Default locale value cannot be empty',
  INVALID_FIELD_VALUE: 'Invalid field value',
  INVALID_UPDATE_SOURCE: 'Update source must be "user" or "system"',
  NO_DATA_RETURNED: 'No data returned from server',
  OPTIMISTIC_LOCK_FAILED: 'Translation was modified by another user. Please refresh and try again.',
  PROJECT_NOT_OWNED: 'Project not owned by user',
  REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource not found',
  TRANSLATION_NOT_FOUND: 'Translation not found',
  VALUE_NO_NEWLINES: 'Translation value cannot contain newlines',
  VALUE_REQUIRED: 'Translation value cannot be empty',
  VALUE_TOO_LONG: `Translation value must be at most ${TRANSLATION_VALUE_MAX_LENGTH} characters`,
} as const;
```

### Step 3: Create Zod Validation Schemas

Create `src/features/translations/api/translations.schemas.ts` with all validation schemas defined in section 3.2.

### Step 4: Create Error Handling Utilities

Create `src/features/translations/api/translations.errors.ts`:

**Note:** The implementation uses constants from `src/shared/constants/translations.constants.ts` for error codes, constraint names, and error messages. This ensures consistency across the application.

```typescript
import type { PostgrestError } from '@supabase/supabase-js';

import type { ApiErrorResponse } from '@/shared/types';

import { TRANSLATIONS_ERROR_MESSAGES, TRANSLATIONS_PG_ERROR_CODES } from '@/shared/constants';
import { createApiErrorResponse } from '@/shared/utils';

/**
 * Handle database errors and convert them to API errors
 *
 * Provides consistent error handling for PostgreSQL errors including:
 * - Foreign key violations (23503)
 * - Check constraint violations (23514)
 * - Trigger violations (default locale validation)
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

  // handle trigger violations (default locale validation)
  if (error.message.includes('cannot be NULL or empty') || error.message.toLowerCase().includes('default_locale')) {
    return createApiErrorResponse(400, TRANSLATIONS_ERROR_MESSAGES.DEFAULT_LOCALE_EMPTY);
  }

  // handle check constraint violations
  if (error.code === TRANSLATIONS_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, TRANSLATIONS_ERROR_MESSAGES.INVALID_FIELD_VALUE, {
      constraint: error.details,
    });
  }

  // handle foreign key violations
  if (error.code === TRANSLATIONS_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return createApiErrorResponse(404, TRANSLATIONS_ERROR_MESSAGES.REFERENCED_RESOURCE_NOT_FOUND);
  }

  // handle authorization errors (project not found or not owned)
  if (error.message.includes('not found') || error.message.includes('access denied')) {
    return createApiErrorResponse(403, TRANSLATIONS_ERROR_MESSAGES.PROJECT_NOT_OWNED);
  }

  // generic database error
  return createApiErrorResponse(500, fallbackMessage || TRANSLATIONS_ERROR_MESSAGES.DATABASE_ERROR, {
    original: error,
  });
}
```

### Step 5: Create Query Keys Factory

Create `src/features/translations/api/translations.key-factory.ts`:

```typescript
/**
 * Query key factory for translations
 * Follows TanStack Query best practices for structured query keys
 */
export const TRANSLATIONS_KEYS = {
  all: ['translations'] as const,
  detail: (projectId: string, keyId: string, locale: string) =>
    [...TRANSLATIONS_KEYS.details(), projectId, keyId, locale] as const,
  details: () => [...TRANSLATIONS_KEYS.all, 'detail'] as const,
};
```

**Note:** Properties are ordered alphabetically for consistency and easier code navigation.

### Step 6: Create TanStack Query Hooks

**Implementation Notes:**

- All hooks follow TanStack Query best practices with proper error handling
- Use optimistic updates for better UX in mutation hooks
- Implement proper cache invalidation strategies
- Include TypeScript generics for type safety

**6.1 Create `src/features/translations/api/useTranslation/useTranslation.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import type { ApiErrorResponse, TranslationResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';

import { createDatabaseErrorResponse } from '../translations.errors';
import { TRANSLATIONS_KEYS } from '../translations.key-factory';
import { GET_TRANSLATION_QUERY_SCHEMA, TRANSLATION_RESPONSE_SCHEMA } from '../translations.schemas';

/**
 * Fetch a translation record for a specific project, key, and locale combination
 *
 * Retrieves a single translation record using direct table access with composite
 * primary key lookup. Returns null if translation doesn't exist (valid state for
 * missing translations). Uses maybeSingle() to handle zero-or-one results.
 * RLS policies ensure only project owners can access translations.
 *
 * @param projectId - Project UUID to fetch translation from (required)
 * @param keyId - Translation key UUID (required)
 * @param localeCode - Target locale code in BCP-47 format (required, e.g., "en", "en-US")
 * @throws {ApiErrorResponse} 400 - Validation error (invalid project_id, key_id, or locale format)
 * @throws {ApiErrorResponse} 403 - Project not owned by user
 * @throws {ApiErrorResponse} 500 - Database error during fetch
 * @returns TanStack Query result with translation data or null if not found
 */
export function useTranslation(projectId: string, keyId: string, localeCode: string) {
  const supabase = useSupabase();

  return useQuery<TranslationResponse | null, ApiErrorResponse>({
    gcTime: 15 * 60 * 1000, // 15 minutes
    queryFn: async () => {
      const { key_id, locale, project_id } = GET_TRANSLATION_QUERY_SCHEMA.parse({
        key_id: keyId,
        locale: localeCode,
        project_id: projectId,
      });

      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .eq('project_id', project_id)
        .eq('key_id', key_id)
        .eq('locale', locale)
        .maybeSingle();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useTranslation', 'Failed to fetch translation');
      }

      if (!data) {
        return null;
      }

      return TRANSLATION_RESPONSE_SCHEMA.parse(data);
    },
    queryKey: TRANSLATIONS_KEYS.detail(projectId, keyId, localeCode),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**6.2 Create `src/features/translations/api/useUpdateTranslation/useUpdateTranslation.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  ApiErrorResponse,
  TranslationResponse,
  UpdateTranslationParams,
  UpdateTranslationRequest,
} from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';

import { createDatabaseErrorResponse } from '../translations.errors';
import { TRANSLATIONS_KEYS } from '../translations.key-factory';
import {
  TRANSLATION_RESPONSE_SCHEMA,
  UPDATE_TRANSLATION_QUERY_SCHEMA,
  UPDATE_TRANSLATION_REQUEST_SCHEMA,
} from '../translations.schemas';

/**
 * Context type for mutation callbacks
 */
interface UpdateTranslationContext {
  previousTranslation?: null | TranslationResponse;
}

/**
 * Update a translation value with optimistic locking and optimistic UI updates
 *
 * Updates a single translation record using direct table access with composite
 * primary key matching and optional optimistic locking via updated_at timestamp.
 * Implements optimistic updates for instant UI feedback and proper rollback
 * on error. Validates translation value constraints and prevents empty values
 * for default locale. Triggers cache invalidation for affected views.
 *
 * @param params - Update parameters and context
 * @param params.projectId - Project UUID for the translation (required)
 * @param params.keyId - Translation key UUID (required)
 * @param params.locale - Target locale code in BCP-47 format (required)
 * @param params.updatedAt - ISO 8601 timestamp for optimistic locking (optional)
 * @throws {ApiErrorResponse} 400 - Validation error (invalid IDs, value constraints, default locale empty)
 * @throws {ApiErrorResponse} 404 - Translation not found
 * @throws {ApiErrorResponse} 409 - Optimistic lock failure (translation modified by another user)
 * @throws {ApiErrorResponse} 500 - Database error during update
 * @returns TanStack Query mutation hook for updating translations with optimistic updates
 */
export function useUpdateTranslation(params: UpdateTranslationParams) {
  const supabase = useSupabase();

  const queryClient = useQueryClient();

  return useMutation<TranslationResponse, ApiErrorResponse, UpdateTranslationRequest, UpdateTranslationContext>({
    mutationFn: async (payload) => {
      const { key_id, locale, project_id, updated_at } = UPDATE_TRANSLATION_QUERY_SCHEMA.parse({
        key_id: params.keyId,
        locale: params.locale,
        project_id: params.projectId,
        updated_at: params.updatedAt,
      });

      const body = UPDATE_TRANSLATION_REQUEST_SCHEMA.parse(payload);

      let query = supabase
        .from('translations')
        .update(body)
        .eq('project_id', project_id)
        .eq('key_id', key_id)
        .eq('locale', locale);

      // add optimistic locking if timestamp provided
      if (updated_at) {
        query = query.eq('updated_at', updated_at);
      }

      const { count, data, error } = await query.select().single();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useUpdateTranslation', 'Failed to update translation');
      }

      // handle optimistic lock failure (no rows affected)
      if (count === 0) {
        throw createApiErrorResponse(409, 'Translation was modified by another user. Please refresh and try again.');
      }

      if (!data) {
        throw createApiErrorResponse(404, 'Translation not found');
      }

      return TRANSLATION_RESPONSE_SCHEMA.parse(data);
    },
    onError: (_err, _newData, context) => {
      // rollback on error
      if (context?.previousTranslation !== undefined) {
        queryClient.setQueryData(
          TRANSLATIONS_KEYS.detail(params.projectId, params.keyId, params.locale),
          context.previousTranslation
        );
      }
    },
    onMutate: async (newData) => {
      // cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: TRANSLATIONS_KEYS.detail(params.projectId, params.keyId, params.locale),
      });

      // snapshot previous value
      const previousTranslation = queryClient.getQueryData<null | TranslationResponse>(
        TRANSLATIONS_KEYS.detail(params.projectId, params.keyId, params.locale)
      );

      // optimistically update
      queryClient.setQueryData(
        TRANSLATIONS_KEYS.detail(params.projectId, params.keyId, params.locale),
        (old: null | TranslationResponse) => {
          // if no previous translation, create new one with optimistic data
          if (!old) {
            return {
              key_id: params.keyId,
              locale: params.locale,
              project_id: params.projectId,
              updated_at: new Date().toISOString(),
              ...newData,
            } as TranslationResponse;
          }

          return {
            ...old,
            ...newData,
            updated_at: new Date().toISOString(),
          };
        }
      );

      return { previousTranslation };
    },
    onSettled: () => {
      // refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: TRANSLATIONS_KEYS.detail(params.projectId, params.keyId, params.locale),
      });
      // also invalidate key lists that show this translation
      queryClient.invalidateQueries({
        queryKey: ['keys', 'per-language', params.projectId, params.locale],
      });
    },
  });
}
```

### Step 7: Create API Index File

Create `src/features/translations/api/index.ts`:

```typescript
export * from './translations.errors';
export * from './translations.key-factory';
export * from './translations.schemas';
export * from './useTranslation';
export * from './useUpdateTranslation';
```

### Step 8: Write Unit Tests

**Testing Strategy:**

- Use Vitest with Testing Library for all tests
- Co-locate tests with source files (`Hook.test.ts` next to `Hook.ts`)
- Mock Supabase client using test utilities
- Test both success and error scenarios comprehensively
- Verify cache behavior and optimistic updates
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

- Successful translation update with optimistic updates
- Optimistic locking success (with updated_at)
- Optimistic locking failure (409 conflict) - **Critical: concurrent edit handling**
- Validation error (empty value for default locale)
- Validation error (value too long, contains newlines)
- Translation not found (404)
- Authorization error (403)
- Optimistic update and rollback on error
- Cache invalidation verification
- **Edge case: network timeout during update**
- **Edge case: partial update with mixed validation errors**
