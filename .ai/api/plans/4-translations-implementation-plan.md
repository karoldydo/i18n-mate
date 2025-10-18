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
3. **Bulk Update Translations** - `PATCH /rest/v1/translations?project_id=eq.{project_id}&locale=eq.{locale}&key_id=in.({key_ids})`

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
PATCH /rest/v1/translations?project_id=eq.{uuid}&key_id=eq.{uuid}&locale=eq.pl&updated_at=eq.2025-01-15T10:20:00Z
```

If no rows are affected (0 matches), return 409 Conflict and client must refetch.

### 2.3 Bulk Update Translations

- **HTTP Method:** PATCH
- **URL Structure:** `/rest/v1/translations?project_id=eq.{project_id}&locale=eq.{locale}&key_id=in.({key_ids})`
- **Authentication:** Required
- **Parameters:**
  - Required (via query filters):
    - `project_id` (UUID) - Project ID
    - `locale` (string) - Target locale code
    - `key_id` (string) - Comma-separated list of key UUIDs: `in.(uuid1,uuid2,uuid3...)`
- **Request Body:**

```json
{
  "is_machine_translated": true,
  "updated_by_user_id": null,
  "updated_source": "system",
  "value": "Translated text"
}
```

**Field Validation:**

- Same validation rules as single update
- All specified translations receive the same values
- Used internally by translation jobs for batch processing

**Note:** This endpoint is primarily used internally by translation jobs. Manual client calls are not recommended due to the risk of overwriting multiple translations with the same value.

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

export type BulkUpdateTranslationRequest = UpdateTranslationRequest;

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
  UPDATE_SOURCE_VALUES,
} from '@/shared/constants';

// Translation value validation (same as used in keys)
const translationValueSchema = z
  .string()
  .min(TRANSLATION_VALUE_MIN_LENGTH, TRANSLATIONS_ERROR_MESSAGES.VALUE_REQUIRED)
  .max(TRANSLATION_VALUE_MAX_LENGTH, TRANSLATIONS_ERROR_MESSAGES.VALUE_TOO_LONG)
  .refine((val) => !val.includes('\n'), TRANSLATIONS_ERROR_MESSAGES.VALUE_NO_NEWLINES)
  .transform((val) => val.trim());

// Locale code validation (BCP-47 format)
const localeCodeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// UUID validation schemas
const projectIdSchema = z.string().uuid('Invalid project ID format');
const keyIdSchema = z.string().uuid('Invalid key ID format');
const userIdSchema = z.string().uuid('Invalid user ID format');

// Update source validation
const updateSourceSchema = z.enum(['user', 'system'] as const, {
  errorMap: () => ({ message: 'Update source must be "user" or "system"' }),
});

// Get Translation Query Schema
export const getTranslationQuerySchema = z.object({
  key_id: keyIdSchema,
  locale: localeCodeSchema,
  project_id: projectIdSchema,
});

// Update Translation Request Schema
export const updateTranslationRequestSchema = z.object({
  is_machine_translated: z.boolean(),
  updated_by_user_id: userIdSchema.nullable(),
  updated_source: updateSourceSchema,
  value: translationValueSchema,
});

// Update Translation Query Schema (with optimistic locking)
export const updateTranslationQuerySchema = getTranslationQuerySchema.extend({
  updated_at: z.string().datetime().optional(), // ISO 8601 timestamp for optimistic locking
});

// Bulk Update Query Schema
export const bulkUpdateTranslationQuerySchema = z.object({
  key_ids: z.array(keyIdSchema).min(1, 'At least one key ID is required'),
  locale: localeCodeSchema,
  project_id: projectIdSchema,
});

// Response Schemas for runtime validation
export const translationResponseSchema = z.object({
  is_machine_translated: z.boolean(),
  key_id: keyIdSchema,
  locale: localeCodeSchema,
  project_id: projectIdSchema,
  updated_at: z.string(),
  updated_by_user_id: userIdSchema.nullable(),
  updated_source: updateSourceSchema,
  value: z.string().nullable(),
});
```

## 4. Response Details

### 4.1 Get Translation

**Success Response (200 OK):**

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

When using Supabase client with `.maybeSingle()` or REST with `Accept: application/vnd.pgrst.object+json`:

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

### 4.3 Bulk Update Translations

**Success Response (200 OK):**

Returns array of updated records:

```json
[
  {
    "is_machine_translated": true,
    "key_id": "uuid1",
    "locale": "pl",
    "project_id": "uuid",
    "updated_at": "2025-01-15T11:05:00Z",
    "updated_by_user_id": null,
    "updated_source": "system",
    "value": "Translated text"
  },
  {
    "is_machine_translated": true,
    "key_id": "uuid2",
    "locale": "pl",
    "project_id": "uuid",
    "updated_at": "2025-01-15T11:05:00Z",
    "updated_by_user_id": null,
    "updated_source": "system",
    "value": "Translated text"
  }
]
```

### 4.4 Error Responses

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
3. Hook validates params using `getTranslationQuerySchema`
4. Hook retrieves Supabase client from `useSupabase()` context
5. Client calls `.from('translations').select('*').eq('project_id', projectId).eq('key_id', keyId).eq('locale', locale).maybeSingle()`
6. RLS policy filters results by project ownership via foreign key to projects table
7. If unauthorized, Supabase returns null → hook throws 404 error
8. If found, translation data is cached by TanStack Query
9. Component renders translation editor with current value and metadata

### 5.2 Update Translation (Inline Edit) Flow

1. User edits translation value in inline editor
2. `useUpdateTranslation` mutation hook receives new value and metadata
3. Hook validates data using `updateTranslationRequestSchema`
4. Hook validates query params using `updateTranslationQuerySchema`
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

### 5.3 Bulk Update Translations Flow

1. Translation job or bulk operation requests multiple translation updates
2. `useBulkUpdateTranslations` mutation hook receives update data and key IDs
3. Hook validates data using `updateTranslationRequestSchema`
4. Hook validates query params using `bulkUpdateTranslationQuerySchema`
5. Hook constructs PostgREST filter: `key_id=in.(uuid1,uuid2,uuid3...)`
6. Hook calls Supabase `.update(validatedData).eq('project_id', projectId).eq('locale', locale).in('key_id', keyIds)`
7. Database triggers perform validation and trimming for each affected row
8. RLS policy validates project ownership for all affected translations
9. On success, array of updated translation records is returned
10. TanStack Query invalidates related caches (per-language key view for the locale)
11. Operation completes with success count

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

**Bulk Operations:**

- Use PostgREST's `in` operator for efficient multi-row updates
- Single query updates multiple rows atomically
- More efficient than N individual update operations

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

```bash
mkdir -p src/features/translations/api
```

### Step 2: Create Translations Constants

Create `src/shared/constants/translations.constants.ts` with centralized constants, patterns, and utilities:

```typescript
/**
 * Translations Constants and Validation Patterns
 *
 * Centralized definitions for translation validation patterns to ensure consistency
 * between TypeScript validation (Zod schemas) and PostgreSQL domain constraints.
 */

// Re-export translation value constraints from keys constants for consistency
import { TRANSLATION_VALUE_MAX_LENGTH, TRANSLATION_VALUE_MIN_LENGTH, KEY_VALIDATION } from './keys.constants';

export { TRANSLATION_VALUE_MAX_LENGTH, TRANSLATION_VALUE_MIN_LENGTH };

// Update source values
export const UPDATE_SOURCE_VALUES = ['user', 'system'] as const;
export type UpdateSourceType = (typeof UPDATE_SOURCE_VALUES)[number];

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
  PROJECT_ID_FKEY: 'translations_project_id_fkey',
  KEY_ID_FKEY: 'translations_key_id_fkey',
  PROJECT_LOCALE_FKEY: 'translations_project_id_locale_fkey',
  PRIMARY_KEY: 'translations_pkey',
} as const;

// Error messages for translations validation
export const TRANSLATIONS_ERROR_MESSAGES = {
  // Validation errors
  VALUE_REQUIRED: 'Translation value cannot be empty',
  VALUE_TOO_LONG: `Translation value must be at most ${TRANSLATION_VALUE_MAX_LENGTH} characters`,
  VALUE_NO_NEWLINES: 'Translation value cannot contain newlines',
  INVALID_UPDATE_SOURCE: 'Update source must be "user" or "system"',

  // Database operation errors
  TRANSLATION_NOT_FOUND: 'Translation not found',
  PROJECT_NOT_OWNED: 'Project not owned by user',
  DEFAULT_LOCALE_EMPTY: 'Default locale value cannot be empty',
  OPTIMISTIC_LOCK_FAILED: 'Translation was modified by another user. Please refresh and try again.',

  // Generic errors
  DATABASE_ERROR: 'Database operation failed',
  NO_DATA_RETURNED: 'No data returned from server',
  INVALID_FIELD_VALUE: 'Invalid field value',
  REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource not found',
} as const;

// Validation utilities
export const TRANSLATION_VALIDATION = {
  /**
   * Validate translation value (client-side)
   * Same rules as KEY_VALIDATION.isValidTranslationValue
   */
  isValidValue: KEY_VALIDATION.isValidTranslationValue,

  /**
   * Check if update source is valid
   */
  isValidUpdateSource: (source: string): source is UpdateSourceType => {
    return UPDATE_SOURCE_VALUES.includes(source as UpdateSourceType);
  },

  /**
   * Sanitize translation value
   * Trims whitespace and ensures valid format
   */
  sanitizeValue: (value: string): string => {
    if (!value || typeof value !== 'string') {
      return '';
    }
    return value.trim();
  },
};
```

Add to `src/shared/constants/index.ts`:

```typescript
export * from './locale.constants';
export * from './keys.constants';
export * from './projects.constants';
export * from './translations.constants';
export type { LocaleCode } from '@/shared/types';
```

### Step 3: Create Zod Validation Schemas

Create `src/features/translations/api/translations.schemas.ts` with all validation schemas defined in section 3.2.

### Step 4: Create Error Handling Utilities

Create `src/features/translations/api/translations.errors.ts`:

**Note:** The implementation uses constants from `src/shared/constants/translations.constants.ts` for error codes, constraint names, and error messages. This ensures consistency across the application.

```typescript
import type { PostgrestError } from '@supabase/supabase-js';
import type { ApiErrorResponse } from '@/shared/types';
import { createApiErrorResponse } from '@/shared/utils';
import { TRANSLATIONS_PG_ERROR_CODES, TRANSLATIONS_CONSTRAINTS, TRANSLATIONS_ERROR_MESSAGES } from '@/shared/constants';

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

  // Handle trigger violations (default locale validation)
  if (error.message.includes('cannot be NULL or empty') || error.message.toLowerCase().includes('default_locale')) {
    return createApiErrorResponse(400, TRANSLATIONS_ERROR_MESSAGES.DEFAULT_LOCALE_EMPTY);
  }

  // Handle check constraint violations
  if (error.code === TRANSLATIONS_PG_ERROR_CODES.CHECK_VIOLATION) {
    return createApiErrorResponse(400, TRANSLATIONS_ERROR_MESSAGES.INVALID_FIELD_VALUE, {
      constraint: error.details,
    });
  }

  // Handle foreign key violations
  if (error.code === TRANSLATIONS_PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return createApiErrorResponse(404, TRANSLATIONS_ERROR_MESSAGES.REFERENCED_RESOURCE_NOT_FOUND);
  }

  // Handle authorization errors (project not found or not owned)
  if (error.message.includes('not found') || error.message.includes('access denied')) {
    return createApiErrorResponse(403, TRANSLATIONS_ERROR_MESSAGES.PROJECT_NOT_OWNED);
  }

  // Generic database error
  return createApiErrorResponse(500, fallbackMessage || TRANSLATIONS_ERROR_MESSAGES.DATABASE_ERROR, {
    original: error,
  });
}
```

### Step 5: Create Query Keys Factory

Create `src/features/translations/api/translations.keys.ts`:

```typescript
/**
 * Query key factory for translations
 * Follows TanStack Query best practices for structured query keys
 */
export const translationsKeys = {
  all: ['translations'] as const,
  detail: (projectId: string, keyId: string, locale: string) =>
    [...translationsKeys.details(), projectId, keyId, locale] as const,
  details: () => [...translationsKeys.all, 'detail'] as const,
};
```

**Note:** Properties are ordered alphabetically for consistency and easier code navigation.

### Step 6: Create TanStack Query Hooks

**6.1 Create `src/features/translations/api/useTranslation/useTranslation.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import type { ApiErrorResponse, TranslationResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';
import { createDatabaseErrorResponse } from '../translations.errors';
import { translationsKeys } from '../translations.keys';
import { getTranslationQuerySchema, translationResponseSchema } from '../translations.schemas';

export function useTranslation(projectId: string, keyId: string, locale: string) {
  const supabase = useSupabase();

  return useQuery<TranslationResponse | null, ApiErrorResponse>({
    gcTime: 15 * 60 * 1000, // 15 minutes
    queryFn: async () => {
      // Validate parameters
      const validated = getTranslationQuerySchema.parse({
        project_id: projectId,
        key_id: keyId,
        locale: locale,
      });

      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .eq('project_id', validated.project_id)
        .eq('key_id', validated.key_id)
        .eq('locale', validated.locale)
        .maybeSingle();

      if (error) {
        throw createDatabaseErrorResponse(error, 'useTranslation', 'Failed to fetch translation');
      }

      // Return null if translation doesn't exist (valid state for missing translations)
      if (!data) {
        return null;
      }

      // Runtime validation of response data
      const validatedResponse = translationResponseSchema.parse(data);
      return validatedResponse;
    },
    queryKey: translationsKeys.detail(projectId, keyId, locale),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**6.2 Create `src/features/translations/api/useUpdateTranslation/useUpdateTranslation.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiErrorResponse, TranslationResponse, UpdateTranslationRequest } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';
import { createDatabaseErrorResponse } from '../translations.errors';
import { translationsKeys } from '../translations.keys';
import {
  updateTranslationRequestSchema,
  updateTranslationQuerySchema,
  translationResponseSchema,
} from '../translations.schemas';

/**
 * Context type for mutation callbacks
 */
interface UpdateTranslationContext {
  previousTranslation?: TranslationResponse | null;
}

export interface UpdateTranslationParams {
  keyId: string;
  locale: string;
  projectId: string;
  // Optimistic locking support
  updatedAt?: string; // ISO 8601 timestamp
}

export function useUpdateTranslation(params: UpdateTranslationParams) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<TranslationResponse, ApiErrorResponse, UpdateTranslationRequest, UpdateTranslationContext>({
    mutationFn: async (updateData) => {
      // Validate query parameters
      const validatedQuery = updateTranslationQuerySchema.parse({
        project_id: params.projectId,
        key_id: params.keyId,
        locale: params.locale,
        updated_at: params.updatedAt,
      });

      // Validate request data
      const validatedInput = updateTranslationRequestSchema.parse(updateData);

      // Build query with optimistic locking support
      let query = supabase
        .from('translations')
        .update(validatedInput)
        .eq('project_id', validatedQuery.project_id)
        .eq('key_id', validatedQuery.key_id)
        .eq('locale', validatedQuery.locale);

      // Add optimistic locking if timestamp provided
      if (validatedQuery.updated_at) {
        query = query.eq('updated_at', validatedQuery.updated_at);
      }

      const { count, data, error } = await query.select().single();

      // Handle database errors
      if (error) {
        throw createDatabaseErrorResponse(error, 'useUpdateTranslation', 'Failed to update translation');
      }

      // Handle optimistic lock failure (no rows affected)
      if (count === 0) {
        throw createApiErrorResponse(409, 'Translation was modified by another user. Please refresh and try again.');
      }

      // Handle missing data
      if (!data) {
        throw createApiErrorResponse(404, 'Translation not found');
      }

      // Runtime validation of response data
      const validatedResponse = translationResponseSchema.parse(data);
      return validatedResponse;
    },
    onError: (_err, _newData, context) => {
      // Rollback on error
      if (context?.previousTranslation !== undefined) {
        queryClient.setQueryData(
          translationsKeys.detail(params.projectId, params.keyId, params.locale),
          context.previousTranslation
        );
      }
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: translationsKeys.detail(params.projectId, params.keyId, params.locale),
      });

      // Snapshot previous value
      const previousTranslation = queryClient.getQueryData<TranslationResponse | null>(
        translationsKeys.detail(params.projectId, params.keyId, params.locale)
      );

      // Optimistically update
      queryClient.setQueryData(
        translationsKeys.detail(params.projectId, params.keyId, params.locale),
        (old: TranslationResponse | null) => {
          // If no previous translation, create new one with optimistic data
          if (!old) {
            return {
              project_id: params.projectId,
              key_id: params.keyId,
              locale: params.locale,
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
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: translationsKeys.detail(params.projectId, params.keyId, params.locale),
      });
      // Also invalidate key lists that show this translation
      queryClient.invalidateQueries({
        queryKey: ['keys', 'per-language', params.projectId, params.locale],
      });
    },
  });
}
```

**6.3 Create `src/features/translations/api/useBulkUpdateTranslations/useBulkUpdateTranslations.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiErrorResponse, TranslationResponse, UpdateTranslationRequest } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';
import { createDatabaseErrorResponse } from '../translations.errors';
import {
  bulkUpdateTranslationQuerySchema,
  updateTranslationRequestSchema,
  translationResponseSchema,
} from '../translations.schemas';
import { z } from 'zod';

export interface BulkUpdateTranslationsParams {
  keyIds: string[];
  locale: string;
  projectId: string;
}

export function useBulkUpdateTranslations(params: BulkUpdateTranslationsParams) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<TranslationResponse[], ApiErrorResponse, UpdateTranslationRequest>({
    mutationFn: async (updateData) => {
      // Validate query parameters
      const validatedQuery = bulkUpdateTranslationQuerySchema.parse({
        project_id: params.projectId,
        key_ids: params.keyIds,
        locale: params.locale,
      });

      // Validate request data
      const validatedInput = updateTranslationRequestSchema.parse(updateData);

      const { data, error } = await supabase
        .from('translations')
        .update(validatedInput)
        .eq('project_id', validatedQuery.project_id)
        .eq('locale', validatedQuery.locale)
        .in('key_id', validatedQuery.key_ids)
        .select();

      // Handle database errors
      if (error) {
        throw createDatabaseErrorResponse(error, 'useBulkUpdateTranslations', 'Failed to bulk update translations');
      }

      // Handle missing data
      if (!data) {
        throw createApiErrorResponse(500, 'No data returned from server');
      }

      // Runtime validation of response data
      const validatedResponse = z.array(translationResponseSchema).parse(data);
      return validatedResponse;
    },
    onSuccess: () => {
      // Invalidate per-language key view cache for the target locale
      queryClient.invalidateQueries({
        queryKey: ['keys', 'per-language', params.projectId, params.locale],
      });

      // Invalidate individual translation caches for all affected keys
      params.keyIds.forEach((keyId) => {
        queryClient.invalidateQueries({
          queryKey: translationsKeys.detail(params.projectId, keyId, params.locale),
        });
      });
    },
  });
}
```

### Step 7: Create API Index File

Create `src/features/translations/api/index.ts`:

```typescript
/**
 * Translations API
 *
 * This module provides TanStack Query hooks for managing translation values.
 * All hooks use the shared Supabase client from context and follow React Query best practices.
 *
 * @module features/translations/api
 */

// Error Utilities
export { createDatabaseErrorResponse } from './translations.errors';

// Query Keys
export { translationsKeys } from './translations.keys';

// Validation Schemas
export * from './translations.schemas';

// Mutation Hooks
export { useBulkUpdateTranslations } from './useBulkUpdateTranslations/useBulkUpdateTranslations';
export { useUpdateTranslation } from './useUpdateTranslation/useUpdateTranslation';

// Query Hooks
export { useTranslation } from './useTranslation/useTranslation';

// Additional exports for type safety
export type { UpdateTranslationParams } from './useUpdateTranslation/useUpdateTranslation';
export type { BulkUpdateTranslationsParams } from './useBulkUpdateTranslations/useBulkUpdateTranslations';
```

**Organization:**

- Error utilities are exported first for use in other features
- Query keys factory for cache management
- Validation schemas for input/output validation
- Hooks grouped by type (mutations vs queries)
- Alphabetical order within each group for easy discovery
- Type exports for better TypeScript integration

### Step 8: Write Unit Tests

**8.1 Create `src/features/translations/api/useTranslation/useTranslation.test.ts`:**

Test scenarios:

- Successful translation fetch with full metadata
- Translation not found (returns null, not error)
- Validation error for invalid project/key/locale ID
- Authorization error (403)
- Database error handling
- Cache behavior verification

**8.2 Create `src/features/translations/api/useUpdateTranslation/useUpdateTranslation.test.ts`:**

Test scenarios:

- Successful translation update with optimistic updates
- Optimistic locking success (with updated_at)
- Optimistic locking failure (409 conflict)
- Validation error (empty value for default locale)
- Validation error (value too long, contains newlines)
- Translation not found (404)
- Authorization error (403)
- Optimistic update and rollback on error
- Cache invalidation verification

**8.3 Create `src/features/translations/api/useBulkUpdateTranslations/useBulkUpdateTranslations.test.ts`:**

Test scenarios:

- Successful bulk update with multiple keys
- Partial success (some keys not found)
- Validation error (invalid key IDs array)
- Validation error (invalid update data)
- Authorization error (403)
- Database error handling
- Cache invalidation for affected keys and locale view
