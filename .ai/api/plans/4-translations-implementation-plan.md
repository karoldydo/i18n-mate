# API Endpoint Implementation Plan: Translations

## 1. Endpoint Overview

The Translations API provides operations for managing translation values for specific (project, key, locale) combinations. Each translation record contains the actual translated text value along with metadata about its source (manual vs. machine-translated) and update history. The API consists of three endpoints that handle retrieval, single update, and bulk update operations with proper authentication, authorization via RLS policies, and comprehensive validation.

### Key Features

- Single translation retrieval with composite key lookup
- Inline translation editing with autosave and optimistic locking
- Bulk translation updates for LLM translation jobs
- Automatic value trimming and validation via database triggers
- Protection against empty values in default locale
- Metadata tracking for manual vs. machine-translated content

### Endpoints Summary

1. **Get Translation** - `GET /rest/v1/translations?project_id=eq.{project_id}&key_id=eq.{key_id}&locale=eq.{locale}`
2. **Update Translation** - `PATCH /rest/v1/translations?project_id=eq.{project_id}&key_id=eq.{key_id}&locale=eq.{locale}`
3. **Bulk Update Translations** - `PATCH /rest/v1/translations?project_id=eq.{project_id}&locale=eq.{locale}&key_id=in.({key_ids})`

## 2. Request Details

### 2.1 Get Translation

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/translations?project_id=eq.{project_id}&key_id=eq.{key_id}&locale=eq.{locale}`
- **Authentication:** Required (JWT via Authorization header)
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project identifier
    - `key_id` (UUID) - Translation key identifier
    - `locale` (string) - BCP-47 locale code (e.g., "en", "pl", "en-US")
  - Optional:
    - `select` (string) - Columns to return (default: all)
- **Request Body:** None

**Example Request:**

```http
GET /rest/v1/translations?project_id=eq.550e8400-e29b-41d4-a716-446655440000&key_id=eq.123e4567-e89b-12d3-a456-426614174000&locale=eq.pl
Authorization: Bearer {access_token}
```

### 2.2 Update Translation (Inline Edit)

- **HTTP Method:** PATCH
- **URL Structure:** `/rest/v1/translations?project_id=eq.{project_id}&key_id=eq.{key_id}&locale=eq.{locale}`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project identifier (via query filter)
    - `key_id` (UUID) - Translation key identifier (via query filter)
    - `locale` (string) - BCP-47 locale code (via query filter)
  - Optional (for optimistic locking):
    - `updated_at` (timestamp) - Last known update timestamp
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

- `value` (required) - Translation text, max 250 chars, no newline, auto-trimmed
  - Empty string converted to NULL (except for default locale)
  - For default locale: cannot be NULL or empty (trigger enforces)
- `is_machine_translated` (required, boolean) - Indicates if translation is LLM-generated
- `updated_source` (required, enum) - Either "user" or "system"
- `updated_by_user_id` (required) - UUID of user making change, or NULL for system updates

**Optimistic Locking (Recommended):**

Include `updated_at` in WHERE clause to prevent lost updates:

```http
PATCH /rest/v1/translations?project_id=eq.{uuid}&key_id=eq.{uuid}&locale=eq.pl&updated_at=eq.2025-01-15T10:20:00Z
```

If no rows affected, return 409 Conflict and client must refetch.

### 2.3 Bulk Update Translations

- **HTTP Method:** PATCH
- **URL Structure:** `/rest/v1/translations?project_id=eq.{project_id}&locale=eq.{locale}&key_id=in.({key_ids})`
- **Authentication:** Required
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project identifier
    - `locale` (string) - Target locale for all updates
    - `key_id` (array of UUIDs) - Translation key identifiers (comma-separated in URL)
- **Request Body:**

```json
{
  "is_machine_translated": true,
  "updated_by_user_id": null,
  "updated_source": "system",
  "value": "Translated text"
}
```

**Note:** This endpoint is primarily used internally by translation jobs (Edge Functions). Direct client use is not recommended as it lacks granular error handling per translation.

## 3. Used Types

### 3.1 Existing Types (from `src/shared/types/types.ts`)

```typescript
// Response DTOs
export type TranslationResponse = Translation; // from Tables<'translations'>

// Request DTOs
export type UpdateTranslationRequest = Pick<
  TranslationUpdate,
  'value' | 'is_machine_translated' | 'updated_source' | 'updated_by_user_id'
>;

export type BulkUpdateTranslationRequest = UpdateTranslationRequest;

// Enums
export type UpdateSourceType = Enums<'update_source_type'>; // 'user' | 'system'

// Error types
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

### 3.2 New Types to Add (in `src/shared/types/types.ts`)

```typescript
/**
 * Get Translation Parameters - composite key lookup
 */
export interface GetTranslationParams {
  project_id: string;
  key_id: string;
  locale: string;
}

/**
 * Update Translation Parameters - includes optimistic locking
 */
export interface UpdateTranslationParams extends GetTranslationParams {
  updated_at?: string; // ISO 8601 timestamp for optimistic locking
}

/**
 * Bulk Update Translation Parameters
 */
export interface BulkUpdateTranslationsParams {
  project_id: string;
  locale: string;
  key_ids: string[];
}
```

### 3.3 New Zod Validation Schemas

Create validation schemas in `src/features/translations/api/translations.schemas.ts`:

```typescript
import { z } from 'zod';

// Locale code validation (BCP-47 format)
const localeCodeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
  message: 'Locale must be in BCP-47 format (e.g., "en" or "en-US")',
});

// UUID validation helper
const uuidSchema = z.string().uuid('Invalid UUID format');

// Translation value validation
const translationValueSchema = z
  .string()
  .max(250, 'Translation value must not exceed 250 characters')
  .refine((val) => !val.includes('\n'), {
    message: 'Translation value cannot contain newline characters',
  })
  .transform((val) => val.trim()) // Auto-trim
  .nullable();

// Get Translation Parameters Schema
export const getTranslationParamsSchema = z.object({
  project_id: uuidSchema,
  key_id: uuidSchema,
  locale: localeCodeSchema,
});

// Update Translation Request Schema
export const updateTranslationRequestSchema = z.object({
  value: translationValueSchema,
  is_machine_translated: z.boolean(),
  updated_source: z.enum(['user', 'system']),
  updated_by_user_id: uuidSchema.nullable(),
});

// Update Translation Parameters Schema (with optimistic locking)
export const updateTranslationParamsSchema = z.object({
  project_id: uuidSchema,
  key_id: uuidSchema,
  locale: localeCodeSchema,
  updated_at: z.string().datetime().optional(), // ISO 8601 timestamp
});

// Bulk Update Translation Parameters Schema
export const bulkUpdateTranslationsParamsSchema = z.object({
  project_id: uuidSchema,
  locale: localeCodeSchema,
  key_ids: z.array(uuidSchema).min(1, 'At least one key_id is required'),
});

// Bulk Update Translation Request Schema (same as single update)
export const bulkUpdateTranslationRequestSchema = updateTranslationRequestSchema;
```

## 4. Response Details

### 4.1 Get Translation

**Success Response (200 OK):**

Returns array with single translation record (Supabase convention):

```json
[
  {
    "is_machine_translated": true,
    "key_id": "123e4567-e89b-12d3-a456-426614174000",
    "locale": "pl",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "updated_at": "2025-01-15T10:20:00Z",
    "updated_by_user_id": null,
    "updated_source": "system",
    "value": "Witaj w domu"
  }
]
```

### 4.2 Update Translation

**Success Response (200 OK):**

Returns single updated translation record:

```json
{
  "is_machine_translated": false,
  "key_id": "123e4567-e89b-12d3-a456-426614174000",
  "locale": "pl",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "updated_at": "2025-01-15T11:00:00Z",
  "updated_by_user_id": "user-uuid",
  "updated_source": "user",
  "value": "Witaj w domu"
}
```

### 4.3 Bulk Update Translations

**Success Response (200 OK):**

Returns array of updated translation records:

```json
[
  {
    "is_machine_translated": true,
    "key_id": "123e4567-e89b-12d3-a456-426614174000",
    "locale": "pl",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "updated_at": "2025-01-15T11:00:00Z",
    "updated_by_user_id": null,
    "updated_source": "system",
    "value": "Translated text 1"
  },
  {
    "is_machine_translated": true,
    "key_id": "456e7890-e89b-12d3-a456-426614174000",
    "locale": "pl",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "updated_at": "2025-01-15T11:00:00Z",
    "updated_by_user_id": null,
    "updated_source": "system",
    "value": "Translated text 2"
  }
]
```

### 4.4 Error Responses

**400 Bad Request (Validation Error):**

```json
{
  "error": {
    "code": "validation_error",
    "details": {
      "constraint": "max_length",
      "field": "value"
    },
    "message": "Translation value must not exceed 250 characters"
  }
}
```

**400 Bad Request (Default Locale Empty Value):**

```json
{
  "error": {
    "code": "validation_error",
    "details": {
      "constraint": "default_locale_not_null",
      "field": "value"
    },
    "message": "Translation value for default locale cannot be empty"
  }
}
```

**400 Bad Request (Newline Character):**

```json
{
  "error": {
    "code": "validation_error",
    "details": {
      "constraint": "no_newline",
      "field": "value"
    },
    "message": "Translation value cannot contain newline characters"
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

**403 Forbidden:**

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
    "message": "Translation not found or access denied"
  }
}
```

**409 Conflict (Optimistic Lock Failure):**

```json
{
  "error": {
    "code": "conflict",
    "message": "Translation has been modified by another user. Please refresh and try again."
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

### 5.1 Get Translation Flow

1. User requests translation value via React component (e.g., translation editor)
2. TanStack Query hook (`useTranslation`) is invoked with composite key params
3. Hook validates params using `getTranslationParamsSchema`
4. Hook retrieves Supabase client from `useSupabase()` context
5. Client queries `translations` table with `.eq()` filters for all three keys
6. RLS policies verify project ownership:
   - Translation → project (via project_id FK)
   - Project → owner_user_id = auth.uid()
7. If unauthorized, Supabase returns empty result → hook returns 404 error
8. If translation doesn't exist, returns 404
9. If found, translation data is cached by TanStack Query
10. Component renders translation value in editor

### 5.2 Update Translation Flow (Inline Edit)

1. User edits translation value in inline editor and triggers autosave
2. `useUpdateTranslation` mutation hook receives composite key and update data
3. Hook validates params using `updateTranslationParamsSchema`
4. Hook validates request body using `updateTranslationRequestSchema`
5. If validation fails, return 400 error immediately with field details
6. Hook constructs Supabase query with `.eq()` filters for composite key
7. If optimistic locking enabled, add `.eq('updated_at', lastKnownTimestamp)` to WHERE clause
8. Client calls `.update()` with validated data
9. Database triggers execute:
   - `trim_translation_value_trigger` - Auto-trims whitespace from value
   - `validate_default_locale_value_trigger` - Checks if locale is default and value is empty
10. If default locale validation fails, trigger raises exception → hook returns 400
11. RLS policy validates project ownership
12. If unauthorized or not found, Supabase returns empty result → hook returns 404
13. If optimistic lock fails (no rows affected due to updated_at mismatch) → hook returns 409
14. On success, updated translation data with new `updated_at` is returned
15. TanStack Query updates cache with new data
16. Component displays success feedback (e.g., green checkmark)

### 5.3 Bulk Update Translations Flow

1. Translation job (Edge Function) completes LLM translation for multiple keys
2. Edge Function calls `useBulkUpdateTranslations` or directly uses Supabase client
3. Hook validates params using `bulkUpdateTranslationsParamsSchema`
4. Hook validates request body using `bulkUpdateTranslationRequestSchema`
5. Client constructs query with `.eq('project_id', projectId).eq('locale', locale).in('key_id', keyIds)`
6. Client calls `.update()` with same data for all matching translations
7. Database triggers execute for each affected row
8. RLS policy validates project ownership for each row
9. PostgreSQL updates all matching rows in a single transaction
10. Returns array of updated translation records
11. TanStack Query invalidates translation caches for affected keys
12. Translation job marks items as completed

**Note:** Bulk update does not support optimistic locking. If granular error handling is needed, use individual updates instead.

## 6. Security Considerations

### 6.1 Authentication

- All endpoints require valid JWT access token in `Authorization: Bearer {token}` header
- Token is obtained via Supabase Auth during sign-in
- Token is stored in Supabase client session and automatically included in requests
- Token expiration is handled by Supabase client with automatic refresh

### 6.2 Authorization

- Row-Level Security (RLS) policies enforce project ownership on all operations
- Translations are indirectly owned through the projects table
- RLS policies check `project_id` FK relationship to verify `owner_user_id = auth.uid()`
- Users can only access translations for their own projects
- RLS policies are defined in `supabase/migrations/20251013143400_create_rls_policies.sql`
- Policy names:
  - `translations_select_policy` - SELECT where project owned by auth.uid()
  - `translations_update_policy` - UPDATE where project owned by auth.uid()

### 6.3 Input Validation

- **Client-side validation:** Zod schemas validate all input before sending to backend
  - Prevents invalid UUIDs, locale codes, oversized values, newline characters
  - Auto-trims whitespace from values
- **Database-level validation:**
  - CHECK constraint: `value !~ '\n'` (prevents newline in SQL)
  - Trigger: `trim_translation_value_trigger` (auto-trims whitespace)
  - Trigger: `validate_default_locale_value_trigger` (enforces NOT NULL for default locale)
  - Foreign key constraints ensure valid project_id, key_id, and (project_id, locale) references

### 6.4 Composite Key Immutability

- The composite primary key `(project_id, key_id, locale)` cannot be changed after creation
- Supabase `.update()` with `.eq()` filters prevents key changes
- Never allow these fields in update request body
- Use separate create/delete operations if key needs to change

### 6.5 Optimistic Locking

- Recommended pattern for inline editing to prevent lost updates
- Client includes last known `updated_at` timestamp in WHERE clause
- If another user has updated the translation, no rows are affected → return 409
- Client must refetch latest data and prompt user to retry
- Prevents race condition where two users edit simultaneously

### 6.6 SQL Injection Prevention

- Supabase client uses parameterized queries for all operations
- Never construct raw SQL strings from user input
- All values are properly escaped by Supabase PostgREST

### 6.7 Data Exposure

- `owner_user_id` is not stored in translations table, only in projects table
- `updated_by_user_id` references the user who made the change (NULL for system updates)
- All fields are safe to expose in responses for authorized users

### 6.8 XSS Prevention

- Newline character validation prevents multi-line injection attacks
- Length limit (250 chars) prevents buffer overflow
- Frontend must escape values when rendering in HTML (React does this automatically)

### 6.9 Rate Limiting

- Supabase provides built-in rate limiting per IP address
- Consider additional rate limiting for bulk operations
- Translation jobs should use Edge Functions with built-in concurrency controls

### 6.10 Locale Verification

- Foreign key constraint on `(project_id, locale)` ensures locale is added to project
- Prevents creating translations for locales not assigned to the project
- Database enforces referential integrity automatically

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Invalid project_id, key_id, or updated_by_user_id format (not UUID)
- Invalid locale code format (not BCP-47)
- Translation value exceeds 250 characters
- Translation value contains newline character (\n)
- Empty or null value for default locale
- Invalid updated_source value (not 'user' or 'system')
- Empty key_ids array for bulk update

**Handling:**

```typescript
try {
  const validatedParams = getTranslationParamsSchema.parse(params);
  const validatedBody = updateTranslationRequestSchema.parse(body);
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

### 7.2 Database Trigger Errors (400)

**Trigger Conditions:**

- Attempt to set empty value for default locale
- `validate_default_locale_value_trigger` raises exception

**Handling:**

```typescript
if (error && error.message.includes('default locale')) {
  return {
    error: {
      code: 'validation_error',
      message: 'Translation value for default locale cannot be empty',
      details: {
        field: 'value',
        constraint: 'default_locale_not_null',
      },
    },
  };
}
```

### 7.3 Authentication Errors (401)

**Trigger Conditions:**

- Missing Authorization header
- Expired JWT token
- Invalid JWT signature
- Revoked token

**Handling:**

- Supabase client automatically handles token refresh
- If refresh fails, redirect user to login page
- Display "Session expired, please log in again" message

### 7.4 Authorization Errors (403/404)

**Trigger Conditions:**

- User attempts to access translation for project owned by another user
- RLS policy denies access

**Handling:**

- Supabase returns empty result set for SELECT/UPDATE queries
- Return 404 "Translation not found or access denied" to avoid leaking existence
- Do not distinguish between "doesn't exist" and "access denied"

```typescript
const { data, error } = await supabase
  .from('translations')
  .select('*')
  .eq('project_id', projectId)
  .eq('key_id', keyId)
  .eq('locale', locale)
  .maybeSingle();

if (!data) {
  return {
    error: {
      code: 'not_found',
      message: 'Translation not found or access denied',
    },
  };
}
```

### 7.5 Not Found Errors (404)

**Trigger Conditions:**

- Translation doesn't exist for (project_id, key_id, locale) combination
- Project doesn't exist
- Key doesn't exist in project
- Locale not added to project (foreign key constraint fails on insert, but not on update)
- RLS policy denies access (appears as not found)

**Handling:**

```typescript
const { data, error } = await supabase
  .from('translations')
  .update(validatedData)
  .eq('project_id', projectId)
  .eq('key_id', keyId)
  .eq('locale', locale)
  .select()
  .maybeSingle();

if (!data) {
  return {
    error: {
      code: 'not_found',
      message: 'Translation not found or access denied',
    },
  };
}
```

### 7.6 Conflict Errors (409)

**Trigger Conditions:**

- Optimistic lock failure: `updated_at` timestamp doesn't match
- Another user has modified the translation since it was last fetched

**Handling:**

```typescript
// Include updated_at in WHERE clause
const { data, error, count } = await supabase
  .from('translations')
  .update(validatedData)
  .eq('project_id', projectId)
  .eq('key_id', keyId)
  .eq('locale', locale)
  .eq('updated_at', lastKnownUpdatedAt) // Optimistic lock
  .select()
  .maybeSingle();

if (count === 0 && !error) {
  // No rows affected = optimistic lock failure
  return {
    error: {
      code: 'conflict',
      message: 'Translation has been modified by another user. Please refresh and try again.',
    },
  };
}
```

### 7.7 Foreign Key Constraint Errors (400)

**Trigger Conditions:**

- Invalid project_id (doesn't exist in projects table)
- Invalid key_id (doesn't exist in keys table)
- Invalid (project_id, locale) combination (locale not added to project)

**Handling:**

```typescript
if (error && error.code === '23503') {
  // Foreign key violation
  return {
    error: {
      code: 'validation_error',
      message: 'Invalid reference: project, key, or locale does not exist',
      details: {
        constraint: 'foreign_key_violation',
      },
    },
  };
}
```

**Note:** These errors should be rare if the UI correctly loads available options.

### 7.8 Server Errors (500)

**Trigger Conditions:**

- Database connection failure
- Trigger execution error (unexpected)
- Unexpected constraint violation
- Transaction failure

**Handling:**

- Log full error details to console (development) or error tracking service (production)
- Return generic message to user: "An unexpected error occurred. Please try again."
- Do not expose internal error details to client

```typescript
const { data, error } = await supabase
  .from('translations')
  .update(validatedData)
  .eq('project_id', projectId)
  .eq('key_id', keyId)
  .eq('locale', locale)
  .select()
  .maybeSingle();

if (error) {
  console.error('[useUpdateTranslation] Update error:', error);

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

### 7.9 Network Errors

**Trigger Conditions:**

- Lost internet connection
- Supabase service unavailable
- Request timeout

**Handling:**

- TanStack Query automatically retries failed requests (3 retries with exponential backoff)
- Display network error message with retry button
- Cache last successful data to show stale content
- For autosave, queue updates and retry when connection restored

## 8. Performance Considerations

### 8.1 Query Optimization

**Indexing:**

- Composite primary key index on `(project_id, key_id, locale)` (auto-created)
- Foreign key indexes on `project_id`, `key_id`, `(project_id, locale)` for efficient joins
- Index on `updated_at` for optimistic locking queries (defined in migrations)
- These indexes ensure fast lookup by composite key

**Query Efficiency:**

- Single translation lookup is O(1) with primary key index
- Bulk update uses `in()` operator which is optimized by PostgreSQL
- RLS policies use indexed columns (project_id → owner_user_id)

### 8.2 Caching Strategy

**TanStack Query Configuration:**

```typescript
// Single translation: 10-minute cache (frequently edited)
staleTime: 10 * 60 * 1000,
gcTime: 30 * 60 * 1000,

// Translation list (per key): 5-minute cache
staleTime: 5 * 60 * 1000,
gcTime: 10 * 60 * 1000,
```

**Cache Invalidation:**

- Update translation → invalidate single translation cache and related list caches
- Bulk update → invalidate all affected translation caches
- Create/delete key → invalidate all translations for that key

**Cache Keys:**

```typescript
export const translationsKeys = {
  all: ['translations'] as const,
  lists: () => [...translationsKeys.all, 'list'] as const,
  list: (params: ListTranslationsParams) => [...translationsKeys.lists(), params] as const,
  details: () => [...translationsKeys.all, 'detail'] as const,
  detail: (params: GetTranslationParams) => [...translationsKeys.details(), params] as const,
};
```

### 8.3 Optimistic Updates

**Update Translation:**

```typescript
const updateMutation = useMutation({
  mutationFn: updateTranslation,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({
      queryKey: translationsKeys.detail({ project_id, key_id, locale }),
    });

    // Snapshot previous value
    const previousTranslation = queryClient.getQueryData(translationsKeys.detail({ project_id, key_id, locale }));

    // Optimistically update with current timestamp
    queryClient.setQueryData(translationsKeys.detail({ project_id, key_id, locale }), (old) => ({
      ...old,
      ...newData,
      updated_at: new Date().toISOString(),
    }));

    return { previousTranslation };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(translationsKeys.detail({ project_id, key_id, locale }), context.previousTranslation);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({
      queryKey: translationsKeys.detail({ project_id, key_id, locale }),
    });
  },
});
```

### 8.4 Debouncing for Autosave

**Inline Edit Autosave:**

- Debounce input changes by 500-1000ms to reduce API calls
- Use `useDebounce` hook from `src/shared/hooks`
- Only trigger update mutation after user stops typing
- Show visual indicator for "saving..." state

```typescript
const debouncedValue = useDebounce(inputValue, 800);

useEffect(() => {
  if (debouncedValue !== initialValue) {
    updateMutation.mutate({ value: debouncedValue });
  }
}, [debouncedValue]);
```

### 8.5 Bulk Update Optimization

**Batch Operations:**

- Bulk update executes as single SQL UPDATE statement
- Much more efficient than N individual updates
- Use for translation jobs processing multiple keys
- Limit batch size to 100-500 keys per request to avoid timeout

**Transaction Safety:**

- All updates in bulk operation are atomic
- If one fails, all fail (transactional integrity)
- Edge Functions should handle partial failures gracefully

### 8.6 Payload Size

- Single translation response: ~150-300 bytes (depending on value length)
- Bulk update response (50 translations): ~7-15 KB
- Compression (gzip) enabled by default in Supabase reduces size by ~60-70%

### 8.7 Database Performance

**Trigger Overhead:**

- `trim_translation_value_trigger` - Minimal overhead (simple string trim)
- `validate_default_locale_value_trigger` - Requires lookup to projects table (indexed)
- Triggers execute for each row, so bulk updates are slower than direct SQL
- Consider disabling triggers for bulk imports (not applicable for this use case)

### 8.8 Connection Pooling

- Supabase handles connection pooling automatically
- Edge Functions use dedicated connection pool
- No additional configuration needed

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

```bash
mkdir -p src/features/translations/{api,components,hooks}
```

### Step 2: Add New Types to Type Definitions

Add new types to `src/shared/types/types.ts`:

- `GetTranslationParams`
- `UpdateTranslationParams`
- `BulkUpdateTranslationsParams`

(See section 3.2 for type definitions)

### Step 3: Create Zod Validation Schemas

Create `src/features/translations/api/translations.schemas.ts` with all validation schemas defined in section 3.3.

### Step 4: Create TanStack Query Hooks

**4.1 Create `src/features/translations/api/useTranslation.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { getTranslationParamsSchema } from './translations.schemas';
import type { GetTranslationParams, TranslationResponse, ApiError } from '@/shared/types';

export const translationsKeys = {
  all: ['translations'] as const,
  lists: () => [...translationsKeys.all, 'list'] as const,
  list: (params: unknown) => [...translationsKeys.lists(), params] as const,
  details: () => [...translationsKeys.all, 'detail'] as const,
  detail: (params: GetTranslationParams) => [...translationsKeys.details(), params] as const,
};

export function useTranslation(params: GetTranslationParams) {
  const supabase = useSupabase();

  return useQuery<TranslationResponse, ApiError>({
    queryKey: translationsKeys.detail(params),
    queryFn: async () => {
      // Validate parameters
      const validated = getTranslationParamsSchema.parse(params);

      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .eq('project_id', validated.project_id)
        .eq('key_id', validated.key_id)
        .eq('locale', validated.locale)
        .maybeSingle();

      if (error) {
        console.error('[useTranslation] Query error:', error);
        throw {
          error: {
            code: 'database_error',
            message: 'Failed to fetch translation',
            details: { original: error },
          },
        };
      }

      if (!data) {
        throw {
          error: {
            code: 'not_found',
            message: 'Translation not found or access denied',
          },
        };
      }

      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
```

**4.2 Create `src/features/translations/api/useUpdateTranslation.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { updateTranslationParamsSchema, updateTranslationRequestSchema } from './translations.schemas';
import { translationsKeys } from './useTranslation';
import type { UpdateTranslationParams, UpdateTranslationRequest, TranslationResponse, ApiError } from '@/shared/types';

interface UpdateTranslationArgs {
  params: UpdateTranslationParams;
  data: UpdateTranslationRequest;
}

export function useUpdateTranslation() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<TranslationResponse, ApiError, UpdateTranslationArgs>({
    mutationFn: async ({ params, data }) => {
      // Validate inputs
      const validatedParams = updateTranslationParamsSchema.parse(params);
      const validatedData = updateTranslationRequestSchema.parse(data);

      // Build query with composite key filters
      let query = supabase
        .from('translations')
        .update(validatedData)
        .eq('project_id', validatedParams.project_id)
        .eq('key_id', validatedParams.key_id)
        .eq('locale', validatedParams.locale);

      // Add optimistic locking if timestamp provided
      if (validatedParams.updated_at) {
        query = query.eq('updated_at', validatedParams.updated_at);
      }

      const { data: result, error, count } = await query.select().maybeSingle();

      if (error) {
        console.error('[useUpdateTranslation] Update error:', error);

        // Handle default locale validation error
        if (error.message.includes('default locale')) {
          throw {
            error: {
              code: 'validation_error',
              message: 'Translation value for default locale cannot be empty',
              details: {
                field: 'value',
                constraint: 'default_locale_not_null',
              },
            },
          };
        }

        // Handle foreign key violations
        if (error.code === '23503') {
          throw {
            error: {
              code: 'validation_error',
              message: 'Invalid reference: project, key, or locale does not exist',
              details: {
                constraint: 'foreign_key_violation',
              },
            },
          };
        }

        throw {
          error: {
            code: 'internal_server_error',
            message: 'Failed to update translation',
            details: { original: error },
          },
        };
      }

      // Check for optimistic lock failure
      if (count === 0 && validatedParams.updated_at) {
        throw {
          error: {
            code: 'conflict',
            message: 'Translation has been modified by another user. Please refresh and try again.',
          },
        };
      }

      if (!result) {
        throw {
          error: {
            code: 'not_found',
            message: 'Translation not found or access denied',
          },
        };
      }

      return result;
    },
    onMutate: async ({ params, data }) => {
      const queryKey = translationsKeys.detail({
        project_id: params.project_id,
        key_id: params.key_id,
        locale: params.locale,
      });

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousTranslation = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old: TranslationResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          ...data,
          updated_at: new Date().toISOString(),
        };
      });

      return { previousTranslation, queryKey };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTranslation) {
        queryClient.setQueryData(context.queryKey, context.previousTranslation);
      }
    },
    onSuccess: (result, variables, context) => {
      // Update cache with server response
      queryClient.setQueryData(context.queryKey, result);
    },
  });
}
```

**4.3 Create `src/features/translations/api/useBulkUpdateTranslations.ts`:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { bulkUpdateTranslationsParamsSchema, bulkUpdateTranslationRequestSchema } from './translations.schemas';
import { translationsKeys } from './useTranslation';
import type {
  BulkUpdateTranslationsParams,
  BulkUpdateTranslationRequest,
  TranslationResponse,
  ApiError,
} from '@/shared/types';

interface BulkUpdateTranslationsArgs {
  params: BulkUpdateTranslationsParams;
  data: BulkUpdateTranslationRequest;
}

export function useBulkUpdateTranslations() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<TranslationResponse[], ApiError, BulkUpdateTranslationsArgs>({
    mutationFn: async ({ params, data }) => {
      // Validate inputs
      const validatedParams = bulkUpdateTranslationsParamsSchema.parse(params);
      const validatedData = bulkUpdateTranslationRequestSchema.parse(data);

      const { data: result, error } = await supabase
        .from('translations')
        .update(validatedData)
        .eq('project_id', validatedParams.project_id)
        .eq('locale', validatedParams.locale)
        .in('key_id', validatedParams.key_ids)
        .select();

      if (error) {
        console.error('[useBulkUpdateTranslations] Update error:', error);

        // Handle default locale validation error
        if (error.message.includes('default locale')) {
          throw {
            error: {
              code: 'validation_error',
              message: 'Translation value for default locale cannot be empty',
              details: {
                field: 'value',
                constraint: 'default_locale_not_null',
              },
            },
          };
        }

        throw {
          error: {
            code: 'internal_server_error',
            message: 'Failed to bulk update translations',
            details: { original: error },
          },
        };
      }

      if (!result || result.length === 0) {
        throw {
          error: {
            code: 'not_found',
            message: 'No translations found to update or access denied',
          },
        };
      }

      return result;
    },
    onSuccess: (result, variables) => {
      // Invalidate all affected translation caches
      variables.params.key_ids.forEach((keyId) => {
        queryClient.invalidateQueries({
          queryKey: translationsKeys.detail({
            project_id: variables.params.project_id,
            key_id: keyId,
            locale: variables.params.locale,
          }),
        });
      });
    },
  });
}
```

### Step 5: Create API Index File

Create `src/features/translations/api/index.ts`:

```typescript
export { useTranslation, translationsKeys } from './useTranslation';
export { useUpdateTranslation } from './useUpdateTranslation';
export { useBulkUpdateTranslations } from './useBulkUpdateTranslations';
export * from './translations.schemas';
```

### Step 6: Write Unit Tests

**6.1 Create `src/features/translations/api/useTranslation.test.ts`:**

Test scenarios:

- Successful translation fetch
- Invalid UUID format (project_id, key_id)
- Invalid locale format
- Translation not found (404)
- RLS access denied (appears as 404)
- Database error handling

**6.2 Create `src/features/translations/api/useUpdateTranslation.test.ts`:**

Test scenarios:

- Successful update (all fields)
- Successful update (value only)
- Validation error (value too long)
- Validation error (newline in value)
- Validation error (empty value for default locale)
- Optimistic update and rollback on error
- Optimistic lock success (with updated_at)
- Optimistic lock failure (conflict 409)
- Translation not found (404)
- Foreign key violation (invalid project/key/locale)

**6.3 Create `src/features/translations/api/useBulkUpdateTranslations.test.ts`:**

Test scenarios:

- Successful bulk update (multiple keys)
- Successful bulk update (single key)
- Validation error (empty key_ids array)
- Validation error (invalid UUID in key_ids)
- No translations found (404)
- Default locale validation error
- Cache invalidation for all affected keys

### Step 7: Create Example Components

**7.1 Create `src/features/translations/components/TranslationEditor.tsx`:**

Inline translation editor component that:

- Uses `useTranslation` hook to load current value
- Uses `useUpdateTranslation` mutation for autosave
- Implements debouncing (500-800ms)
- Shows "Saving..." indicator during mutation
- Shows success checkmark after save
- Shows error message and allows retry
- Handles optimistic locking conflicts

**7.2 Create `src/features/translations/components/TranslationCell.tsx`:**

Table cell component for translation grids:

- Renders read-only or editable mode
- Switches to edit mode on click/focus
- Autosaves on blur or debounced input
- Shows loading/success/error states inline

**7.3 Create `src/features/translations/hooks/useTranslationAutosave.ts`:**

Custom hook that combines:

- `useDebounce` for input debouncing
- `useUpdateTranslation` mutation
- Optimistic locking with stored `updated_at`
- Error recovery and retry logic

### Step 8: Create Route Components (if needed)

**8.1 Create `src/features/translations/routes/TranslationsGridPage.tsx`:**

Page component that:

- Renders grid/table of translations for a project
- Uses `TranslationCell` components for each translation
- Allows inline editing with autosave
- Filters by locale, key search, etc.

**Note:** Translations are typically embedded in key management pages, not separate routes.

### Step 9: Add Component Tests

Write tests for each component using Testing Library:

- User interactions (typing, blur, focus)
- Debouncing behavior
- Loading states
- Success states with visual feedback
- Error states with retry button
- Optimistic updates and rollback
- Optimistic lock conflicts

### Step 10: Integration Testing

Test complete user flows:

1. User loads translation editor → sees current value
2. User types new value → debounced autosave triggers → success indicator
3. User types too-long value → validation error shown
4. Two users edit simultaneously → second user sees conflict error and must refresh
5. User edits default locale translation → cannot set empty value

### Step 11: Edge Function Integration (for Bulk Updates)

**11.1 Create `supabase/functions/translate/bulk-update.ts`:**

Helper function in Edge Function that:

- Uses Supabase client with service role (bypasses RLS for efficiency)
- Validates translation job ownership before bulk update
- Calls bulk update with system credentials
- Handles partial failures gracefully

**Note:** Edge Functions already exist for translation jobs. Update them to use `useBulkUpdateTranslations` or direct Supabase calls.

### Step 12: Documentation

**12.1 Add JSDoc comments to all hooks**

**12.2 Create `src/features/translations/README.md`:**

Document:

- Feature overview
- Available hooks and their usage
- Optimistic locking pattern
- Autosave best practices
- Example code snippets

### Step 13: Performance Audit

- Verify query caching works correctly
- Test autosave debouncing reduces API calls
- Check optimistic updates provide instant feedback
- Test with large bulk updates (500 keys)
- Monitor database query performance for bulk operations

### Step 14: Accessibility Review

- Ensure translation editor has proper labels and ARIA attributes
- Test keyboard navigation (Tab, Enter to edit, Escape to cancel)
- Verify screen reader announces save status
- Check focus management after save/error

### Step 15: Final Review and Deployment

- Run `npm run lint` and fix any issues
- Run `npm run test` and ensure 100% coverage for API layer
- Update `.ai/api/plans/translations-implementation-plan.md` with any changes
- Create pull request with comprehensive description
- Request code review from team members
- Merge and deploy to staging environment
- Monitor error tracking for production issues
- Test edge cases with real translation jobs
