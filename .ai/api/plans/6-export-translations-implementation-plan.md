# API Endpoint Implementation Plan: Export Translations

## 1. Endpoint Overview

The Export Translations endpoint provides a streamlined way to export all project translations as a downloadable ZIP archive containing individual JSON files for each locale. This feature enables users to easily extract their translation data in an i18next-compatible format for integration with their frontend applications.

### Key Features

- **ZIP Archive Generation**: Creates an in-memory ZIP file with separate JSON files for each project locale
- **i18next Compatibility**: Exports translations in flat JSON format with dotted key notation (e.g., "app.home.title")
- **Streaming Support**: Optimized for large projects with streaming capabilities
- **Consistent Sorting**: Alphabetically sorted keys for predictable and version-control-friendly output
- **Automatic File Naming**: Dynamic filename generation with project name and timestamp
- **Edge Function Implementation**: Leverages Supabase Edge Functions for serverless execution

### Endpoints Summary

1. **Export Project Translations** - `GET /functions/v1/export-translations?project_id={project_id}`

## 2. Request Details

### 2.1 Export Project Translations

- **HTTP Method:** GET
- **URL Structure:** `/functions/v1/export-translations?project_id={project_id}`
- **Authentication:** Required (JWT via Authorization header)
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project ID to export translations for
- **Request Body:** None

**Parameter Validation:**

- `project_id` must be a valid UUID format
- Project must exist and be owned by the authenticated user (enforced via RLS)

## 3. Used Types

**Note:** As of the latest refactoring, all types are organized by feature in separate directories under `src/shared/types/`.

### 3.1 Existing Types

- Import from `@/shared/types` (central) or `@/shared/types/export` (feature-specific) for consistency between app and Edge Function.
- `ExportedTranslations`: flat `Record<string, string>` used per-locale to represent dotted keys to string values.
- `ExportTranslationsData`: map of locale code to `ExportedTranslations` aggregated for ZIP generation.
- `ApiErrorResponse`: `{ data: null, error: { code, message, details? } }` used across client and server for standardized errors.

### 3.2 New Zod Validation Schemas

Create validation schemas in `src/features/export/api/export.schemas.ts`:

- `EXPORT_TRANSLATIONS_SCHEMA`: validates `{ project_id }` as UUID and surfaces `EXPORT_ERROR_MESSAGES.INVALID_PROJECT_ID` on failure.
- Align with Edge Function query parsing for a single source of truth.

**Note:** Export-specific constants are defined in `src/shared/constants/export.constants.ts` and include `EXPORT_ERROR_MESSAGES` for centralized error messaging.

## 4. Response Details

### 4.1 Export Project Translations

**Success Response (200 OK):**

**Response Headers:**

- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="project-{name}-{timestamp}.zip"`

**ZIP Archive Contents:**

- One JSON file per locale named `{locale}.json` (e.g., `en.json`, `pl.json`).

**Individual JSON File Format:**

- Flat JSON with dotted keys (i18next-compatible), string values only; keys sorted alphabetically.

### 4.2 Error Responses

All error responses follow the structure: `{ data: null, error: { code, message, details? } }`

**401 Unauthorized:**

```json
{
  "data": null,
  "error": {
    "code": 401,
    "message": "Authentication required"
  }
}
```

**404 Not Found:**

```json
{
  "data": null,
  "error": {
    "code": 404,
    "message": "Project not found or access denied"
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

### 5.1 Edge Function Processing Flow

1. **Request Validation:**
   - Extract `project_id` from query parameters
   - Validate UUID format
   - Verify authentication token

2. **Authorization Check:**
   - RLS policies automatically validate project ownership
   - Return 404 if project not found or access denied

3. **Data Retrieval:**
   - Query all active project locales (exclude any marked as deleted)
   - For each locale, run a JOIN selecting `k.full_key` and `t.value` filtered by `project_id` and locale, ordered by key ascending.

4. **Data Transformation:**
   - Build flat JSON objects for each locale
   - Convert NULL/empty values to empty strings
   - Sort keys alphabetically for consistency

5. **ZIP Generation:**
   - Create in-memory ZIP archive
   - Add `{locale}.json` files with UTF-8 encoding and LF line endings
   - Set appropriate ZIP metadata

6. **Response Streaming:**
   - Set Content-Type and Content-Disposition headers
   - Stream ZIP data to client
   - Handle large projects with streaming capabilities

### 5.2 Frontend Integration

The frontend will handle this endpoint differently than standard TanStack Query patterns:

1. **Download Trigger:**
   - User clicks export button in project settings
   - Frontend creates a temporary download link or triggers browser download

2. **Authentication:**
   - Include JWT token in Authorization header
   - Handle token refresh if needed

3. **Progress Indication:**
   - Show loading state during export generation
   - Display success/error feedback after completion

4. **Error Handling:**
   - Parse JSON error responses for user-friendly messages
   - Handle network timeouts and connection issues

## 6. Security Considerations

### 6.1 Authentication & Authorization

- **JWT Authentication:** Required for all requests via Authorization header
- **Project Ownership:** RLS policies ensure users can only export their own projects
- **No Sensitive Data:** Translation content is the only data exposed in exports

### 6.2 Data Protection

- **Access Control:** Project-level isolation prevents unauthorized access to other users' translations
- **Content Sanitization:** Translation values are safely encoded in JSON format
- **No Metadata Exposure:** Internal IDs and system metadata are not included in exports

### 6.3 Rate Limiting

- **Edge Function Limits:** Natural protection via Supabase Edge Function execution limits
- **Resource Management:** In-memory ZIP generation with reasonable size constraints

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Missing or empty `project_id` parameter
- Invalid UUID format for `project_id`
- Malformed query parameters

**Handling:**

- Client hooks validate inputs with Zod and return standardized `ApiErrorResponse` via shared utilities.
- If `project_id` is missing, return `400` with `ApiErrorResponse` using `EXPORT_ERROR_MESSAGES.PROJECT_ID_REQUIRED`.
- Validate UUID via `EXPORT_TRANSLATIONS_SCHEMA`; on failure, return `400` with the first validation issue message.

**Result Format:**

```json
{
  "data": null,
  "error": {
    "code": 400,
    "details": {
      "constraint": "uuid",
      "field": "project_id"
    },
    "message": "Project ID must be a valid UUID"
  }
}
```

### 7.2 Authorization Errors (401/404)

**Trigger Conditions:**

- Missing or invalid JWT token
- Expired authentication
- Project not owned by authenticated user
- Project doesn't exist

**Handling:**

- Supabase returns empty result set for SELECT queries
- Return 404 "Project not found or access denied" to avoid leaking existence
- Do not distinguish between "doesn't exist" and "access denied"

### 7.3 Server Errors (500)

**Trigger Conditions:**

- Database connection failures
- ZIP generation errors
- Memory limitations during processing
- Query timeouts
- File system errors

**Handling:**

- Log full error details to console (development)
- Return generic message to user: "An unexpected error occurred. Please try again."
- Do not expose internal error details to client

## 8. Performance Considerations

### 8.1 Query Optimization

**Indexing:**

- Primary key index on `id` (auto-created)
- Foreign key indexes on `project_id`, `key_id`, and `locale` for efficient filtering
- Indexes defined in `supabase/migrations/20251013143200_create_indexes.sql`

**Efficient Queries:**

- Use JOIN operations instead of multiple queries
- Leverage existing indexes on project_id, key_id, and locale
- Result streaming for large datasets
- Connection pooling via Supabase's built-in management

### 8.2 Caching Strategy

**Edge Function Caching:**

- Server-side caching with 5-minute TTL keyed by `project_id` + `max(updated_at)`
- Cache invalidation when translations are updated to ensure fresh exports
- Leverage Supabase Edge Function caching for repeated downloads

### 8.3 Memory Management

**ZIP Generation:**

- Streaming ZIP creation to avoid loading entire archive in memory
- Incremental processing of locales to minimize memory footprint
- Appropriate buffer sizes for optimal performance

### 8.4 Large Project Handling

**Streaming Thresholds:**

- Use streaming for projects with >10,000 keys
- ZIP compression for smaller file sizes
- Appropriate timeouts for Edge Function execution

## 9. Implementation Steps

### Step 1: Create Edge Function Structure

- Create `supabase/functions/export-translations` and configure `supabase/functions/deno.json` imports for `@supabase/supabase-js`, `jszip`, and `zod`.
- Ensure required env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are available to the function runtime.

### Step 2: Create Edge Function Implementation

- Implement `supabase/functions/export-translations/index.ts` with `Deno.serve` exposing `handleExportRequest` for `GET` requests.
- Add helpers `createResponse` and `errorResponse` to standardize JSON/binary responses using `ApiErrorResponse`.
- Define `exportRequestSchema` to validate `project_id` as UUID server-side.

### Step 3: Implement Request Validation

- Parse `project_id` from the URL; return `400` with `EXPORT_ERROR_MESSAGES.PROJECT_ID_REQUIRED` when missing.
- Validate using `exportRequestSchema`; map the first Zod issue to `ApiErrorResponse` with `400`.
- Initialize Supabase via `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; return `500` on misconfiguration.

### Step 4: Implement Authentication & Authorization

- Read `Authorization` header with `Bearer` token; return `401` for missing/invalid header.
- Verify token via `supabase.auth.getUser(token)`; extract `user.id` or return `401` on error/expired token.

### Step 5: Implement Data Retrieval

- Verify project ownership and read `project.name`; return `404` if not found or not owned by the user.
- Select all project locales ordered by code; return `404` if none exist.
- Per locale, fetch `full_key` and translation `value` in one joined query; build flat `ExportedTranslations` with empty string for missing values.

### Step 6: Add ZIP Library Import

- Import `jszip` and initialize a `JSZip` instance for in-memory archive creation.

### Step 7: Implement ZIP Generation

- Add `{locale}.json` entries to the archive with alphabetically sorted keys and UTF-8 JSON content.
- Generate a ZIP buffer and return `200` with `Content-Type: application/zip` and `Content-Disposition` filename `project-{name}-{timestamp}.zip`.

### Step 8: Create Frontend Export Hook

- Implement `src/features/export/api/useExportTranslations/useExportTranslations.ts` exposing `useExportTranslations(projectId)` as a mutation.
- Validate with `EXPORT_TRANSLATIONS_SCHEMA`, get session via `useSupabase`, and call the Edge Function with `Authorization` and `apikey` headers.
- On success, read the ZIP `Blob`, derive filename from `Content-Disposition` (fallback uses `projectId` + timestamp), and trigger a browser download.
- On failure, parse JSON errors when present and throw via `createEdgeFunctionErrorResponse` mapped to `ApiErrorResponse`.

### Step 9: Write Unit Tests

**Testing Strategy:**

- Use Vitest with Testing Library for comprehensive test coverage
- Co-locate tests with source files (`Hook.test.ts` next to `Hook.ts`)
- Mock Supabase client and Edge Function calls using test utilities from `src/test/`
- Test both success and error scenarios with export edge cases
- Verify file download behavior and error handling
- Aim for 90% coverage threshold as per project requirements

**9.1 Create `src/features/export/api/useExportTranslations/useExportTranslations.test.ts`:**

Test scenarios:

- Successful export and download trigger
- Authentication error (missing or invalid token)
- Project not found or access denied (404)
- Invalid project ID format (400)
- Edge Function error responses (500)
- Network timeout and connection issues
- Large project export handling
- Empty project export (no locales)
- Download filename extraction from Content-Disposition header
- Fallback filename generation when header missing
- Blob creation and URL management
- DOM element cleanup after download
