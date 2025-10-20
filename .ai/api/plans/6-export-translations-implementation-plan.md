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

### Endpoint Summary

**Export Project Translations** - `GET /functions/v1/export-translations?project_id={project_id}`

## 2. Request Details

### 2.1 Export Project Translations

- **HTTP Method:** GET
- **URL Structure:** `/functions/v1/export-translations?project_id={project_id}`
- **Authentication:** Required (JWT via Authorization header)
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project ID to export translations for
- **Request Body:** None

**Example Request:**

```http
GET /functions/v1/export-translations?project_id=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {access_token}
```

**Parameter Validation:**

- `project_id` must be a valid UUID format
- Project must exist and be owned by the authenticated user (enforced via RLS)

## 3. Used Types

### 3.1 Existing Types (from `src/shared/types/types.ts`)

```typescript
// Export Response Types
export type ExportedTranslations = Record<string, string>;

export type ExportTranslationsData = Record<string, ExportedTranslations>;

// Error types
export interface ApiErrorResponse {
  data: null;
  error: {
    code: number;
    details?: Record<string, unknown>;
    message: string;
  };
}
```

### 3.2 New Constants and Validation

Create constants in `src/shared/constants/export.constants.ts`:

**Note:** The implementation uses centralized constants for validation patterns, error messages, and configuration. This ensures consistency between client-side validation and Edge Function constraints.

```typescript
/**
 * Export Constants and Configuration
 *
 * Centralized definitions for export functionality to ensure consistency
 * between Edge Function implementation and frontend validation.
 */

/**
 * Maximum file size for exports (in bytes)
 * Currently set to 50MB to handle large projects
 */
export const EXPORT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Maximum number of keys per project for export
 * Prevents timeout and memory issues
 */
export const EXPORT_MAX_KEYS_LIMIT = 100000;

/**
 * Export timeout in milliseconds (Edge Function limit)
 */
export const EXPORT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * ZIP compression level (0-9, where 9 is best compression)
 */
export const EXPORT_ZIP_COMPRESSION_LEVEL = 6;

/**
 * Error messages for export operations
 */
export const EXPORT_ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  EXPORT_GENERATION_FAILED: 'Export generation failed',
  INVALID_PROJECT_ID: 'Invalid project ID format',
  PROJECT_ID_REQUIRED: 'Project ID is required',
  PROJECT_NOT_FOUND: 'Project not found or access denied',
  PROJECT_TOO_LARGE: 'Project too large to export',
} as const;

/**
 * Export file naming patterns
 */
export const EXPORT_FILENAME_PATTERN = /^project-[a-zA-Z0-9_-]+-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.zip$/;

/**
 * Supported locale file extensions
 */
export const EXPORT_LOCALE_FILE_EXTENSION = '.json' as const;
```

### 3.3 New Zod Validation Schemas

Create validation schemas in `src/features/export/api/export.schemas.ts`:

```typescript
import { z } from 'zod';
import { EXPORT_ERROR_MESSAGES } from '@/shared/constants';

export const exportTranslationsSchema = z.object({
  project_id: z.string().uuid(EXPORT_ERROR_MESSAGES.INVALID_PROJECT_ID),
});
```

## 4. Response Details

### 4.1 Success Response (200 OK)

**Response Headers:**

- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="project-{name}-{timestamp}.zip"`

**ZIP Archive Contents:**

```text
en.json
pl.json
de.json
```

**Individual JSON File Format (`en.json` example):**

```json
{
  "app.home.subtitle": "Get started now",
  "app.home.title": "Welcome Home",
  "app.settings.label": "Settings"
}
```

### 4.2 Error Responses

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
    "details": {
      "original": "detailed error information"
    },
    "message": "Export generation failed"
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
   - For each locale, execute optimized query:

     ```sql
     SELECT k.full_key, t.value
     FROM keys k
     JOIN translations t ON k.id = t.key_id
     WHERE k.project_id = $1 AND t.locale = $2
     ORDER BY k.full_key ASC
     ```

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

### 7.1 Input Validation Errors (400)

**Trigger Conditions:**

- Missing or empty `project_id` parameter
- Invalid UUID format for `project_id`
- Malformed query parameters

**Handling:**

```typescript
const { project_id } = url.searchParams;

if (!project_id) {
  return new Response(
    JSON.stringify({
      data: null,
      error: {
        code: 400,
        message: 'Project ID is required',
      },
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

// Validate UUID format using Zod
const validated = exportTranslationsSchema.parse(url.searchParams);
```

### 7.2 Authorization Errors (401/404)

**Trigger Conditions:**

- Missing or invalid JWT token
- Expired authentication
- Project not owned by authenticated user
- Project doesn't exist

**Handling:**

RLS policies automatically handle project ownership validation. If a project is not accessible, the query returns empty results, which we convert to a 404 response to avoid leaking project existence information.

### 7.3 Processing Errors (500)

**Trigger Conditions:**

- Database connection failures
- ZIP generation errors
- Memory limitations during processing
- Query timeouts
- File system errors

**Handling:**

All server errors are caught and logged, with generic error messages returned to prevent information leakage:

### 7.4 Edge Function Error Handling

```typescript
// Error handling pattern within Edge Function
try {
  // Main export logic
} catch (error) {
  console.error('Export failed:', error);

  return new Response(
    JSON.stringify({
      data: null,
      error: {
        code: 500,
        message: 'Export generation failed',
        details: { original: error.message },
      },
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

## 8. Performance Considerations

### 8.1 Database Optimization

- **Efficient Queries:** Use JOIN operations instead of multiple queries
- **Index Usage:** Leverage existing indexes on project_id, key_id, and locale
- **Result Streaming:** Process results row-by-row for large datasets
- **Connection Pooling:** Utilize Supabase's built-in connection management

### 8.2 Memory Management

- **Streaming ZIP Creation:** Avoid loading entire ZIP in memory for large projects
- **Incremental Processing:** Process locales one at a time to minimize memory footprint
- **Buffer Management:** Use appropriate buffer sizes for optimal performance

### 8.3 Caching Strategy

- **Server-Side Caching:** Implement 5-minute TTL cache keyed by `project_id` + `max(updated_at)`
- **Cache Invalidation:** Clear cache when translations are updated
- **Edge Caching:** Leverage Supabase Edge Function caching capabilities

### 8.4 Large Project Handling

- **Streaming Threshold:** Use streaming for projects with >10,000 keys
- **Compression Optimization:** Utilize ZIP compression for smaller file sizes
- **Timeout Protection:** Set appropriate timeouts for Edge Function execution

## 9. Implementation Steps

### Step 1: Create Edge Function Structure

```bash
mkdir -p supabase/functions/export-translations
```

Update `supabase/functions/deno.json` to include JSZip dependency:

```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.47.0",
    "jszip": "https://esm.sh/jszip@3.10.1",
    "zod": "https://esm.sh/zod@3.22.4"
  }
}
```

### Step 2: Create Edge Function Implementation

Create `supabase/functions/export-translations/index.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// =============================================================================
// Types
// =============================================================================

interface ApiErrorResponse {
  data: null;
  error: {
    code: number;
    details?: Record<string, unknown>;
    message: string;
  };
}

interface ExportedTranslations {
  [key: string]: string;
}

interface ExportTranslationsData {
  [locale: string]: ExportedTranslations;
}

type SupabaseClient = ReturnType<typeof createClient>;

// =============================================================================
// Validation Schema
// =============================================================================

const exportRequestSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
});

// =============================================================================
// Helper Functions
// =============================================================================

function createResponse(status: number, body: Uint8Array | object, headers: HeadersInit = {}) {
  const defaultHeaders = { 'Content-Type': 'application/json' };
  const finalHeaders = { ...defaultHeaders, ...headers };

  const responseBody = body instanceof Uint8Array ? body : JSON.stringify(body);

  return new Response(responseBody, {
    status,
    headers: finalHeaders,
  });
}

function errorResponse(code: number, message: string, details?: Record<string, unknown>): ApiErrorResponse {
  return {
    data: null,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

// =============================================================================
// Main Handler
// =============================================================================

async function handleExportRequest(req: Request): Promise<Response> {
  try {
    // Validate request method
    if (req.method !== 'GET') {
      return createResponse(405, errorResponse(405, 'Method not allowed'));
    }

    // Implementation details in steps below
    // ...
  } catch (error) {
    console.error('[export-translations] Unexpected error:', error);
    return createResponse(500, errorResponse(500, 'Export generation failed'));
  }
}

// =============================================================================
// Deno HTTP Handler
// =============================================================================

Deno.serve(handleExportRequest);
```

### Step 3: Implement Request Validation

Add request validation logic to the main handler:

```typescript
// Extract query parameters
const url = new URL(req.url);
const project_id = url.searchParams.get('project_id');

if (!project_id) {
  return createResponse(400, errorResponse(400, 'Project ID is required'));
}

// Validate query parameters using Zod
let validatedParams: { project_id: string };
try {
  validatedParams = exportRequestSchema.parse({ project_id });
} catch (error) {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    return createResponse(
      400,
      errorResponse(400, issue.message, {
        constraint: 'validation',
        field: issue.path.join('.'),
      })
    );
  }
  return createResponse(400, errorResponse(400, 'Request validation failed'));
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[export-translations] Missing Supabase configuration');
  return createResponse(500, errorResponse(500, 'Service configuration error'));
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

### Step 4: Implement Authentication & Authorization

Add JWT token validation following the established pattern:

```typescript
// Extract and verify authorization
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return createResponse(401, errorResponse(401, 'Missing or invalid authorization'));
}

const token = authHeader.slice(7);

// Verify JWT and get user ID
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser(token);

if (authError || !user) {
  return createResponse(401, errorResponse(401, 'Invalid or expired token'));
}

const userId = user.id;
```

### Step 5: Implement Data Retrieval

Add database queries for project verification and translations data:

```typescript
// ==========================================================================
// Project Validation & Data Retrieval
// ==========================================================================

// 1. Verify project ownership and get project details
const { data: project, error: projectError } = await supabase
  .from('projects')
  .select('id, name')
  .eq('id', validatedParams.project_id)
  .eq('owner_user_id', userId)
  .maybeSingle();

if (projectError) {
  console.error('[export-translations] Project fetch error:', projectError);
  return createResponse(500, errorResponse(500, 'Database operation failed'));
}

if (!project) {
  return createResponse(404, errorResponse(404, 'Project not found or access denied'));
}

// 2. Get all project locales
const { data: locales, error: localesError } = await supabase
  .from('project_locales')
  .select('locale')
  .eq('project_id', validatedParams.project_id)
  .order('locale');

if (localesError) {
  console.error('[export-translations] Locales fetch error:', localesError);
  return createResponse(500, errorResponse(500, 'Failed to fetch project locales'));
}

if (!locales || locales.length === 0) {
  console.warn('[export-translations] No locales found for project:', validatedParams.project_id);
  return createResponse(404, errorResponse(404, 'No locales found for project'));
}

// 3. Get translations for each locale
const translationsData: ExportTranslationsData = {};

for (const { locale } of locales) {
  const { data: translations, error: translationsError } = await supabase
    .from('keys')
    .select(
      `
      full_key,
      translations!left(value)
    `
    )
    .eq('project_id', validatedParams.project_id)
    .eq('translations.locale', locale)
    .order('full_key');

  if (translationsError) {
    console.error(`[export-translations] Translations fetch error for locale ${locale}:`, translationsError);
    return createResponse(500, errorResponse(500, `Failed to fetch translations for locale ${locale}`));
  }

  // Build flat JSON object for this locale
  translationsData[locale] = {};
  for (const row of translations || []) {
    // Handle both cases: translation exists (row.translations[0]) or doesn't exist (null)
    const translationValue = row.translations?.[0]?.value || '';
    translationsData[locale][row.full_key] = translationValue;
  }
}
```

### Step 6: Add ZIP Library Import

First, update the imports at the top of the file to include JSZip:

```typescript
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import JSZip from 'jszip';
```

### Step 7: Implement ZIP Generation

Add ZIP creation and response streaming after data retrieval:

```typescript
// ==========================================================================
// ZIP Generation & Response
// ==========================================================================

try {
  // Create ZIP archive
  const zip = new JSZip();

  // Add JSON files for each locale
  for (const [locale, translations] of Object.entries(translationsData)) {
    // Sort keys alphabetically for consistent output
    const sortedTranslations: ExportedTranslations = {};
    Object.keys(translations)
      .sort()
      .forEach((key) => {
        sortedTranslations[key] = translations[key];
      });

    const jsonContent = JSON.stringify(sortedTranslations, null, 2);
    zip.file(`${locale}.json`, jsonContent);
  }

  // Generate ZIP file
  const zipBuffer = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Create filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const sanitizedProjectName = project.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `project-${sanitizedProjectName}-${timestamp}.zip`;

  // Return ZIP file
  return createResponse(200, zipBuffer, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
} catch (zipError) {
  console.error('[export-translations] ZIP generation error:', zipError);
  return createResponse(500, errorResponse(500, 'Failed to generate export file'));
}
```

### Step 8: Create Frontend Export Hook

Create `src/features/export/api/useExportTranslations/useExportTranslations.ts`:

```typescript
import { useMutation } from '@tanstack/react-query';
import type { ApiErrorResponse } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { createApiErrorResponse } from '@/shared/utils';
import { createEdgeFunctionErrorResponse } from '../export.errors';
import { exportTranslationsSchema } from '../export.schemas';

/**
 * Export project translations as ZIP file
 *
 * Triggers download of ZIP archive containing JSON files for each locale.
 * Uses browser download API to save file with auto-generated filename.
 *
 * @param projectId - UUID of the project to export
 * @throws {ApiErrorResponse} 400 - Invalid project ID format
 * @throws {ApiErrorResponse} 401 - Authentication required
 * @throws {ApiErrorResponse} 404 - Project not found or access denied
 * @throws {ApiErrorResponse} 500 - Export generation failed
 * @returns TanStack Query mutation hook for exporting translations
 */
export function useExportTranslations(projectId: string) {
  const supabase = useSupabase();

  return useMutation<void, ApiErrorResponse, void>({
    mutationFn: async () => {
      // Validate project ID
      const validated = exportTranslationsSchema.parse({ project_id: projectId });

      // Get current session for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw createApiErrorResponse(401, 'Authentication required');
      }

      // Call Edge Function with authenticated fetch
      // Note: supabase.functions.invoke() is not ideal for GET with query params and binary responses
      const functionUrl = `${supabase.supabaseUrl}/functions/v1/export-translations?project_id=${validated.project_id}`;

      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabase.supabaseKey,
        },
      });

      if (!response.ok) {
        if (response.headers.get('content-type')?.includes('application/json')) {
          const errorData = await response.json();
          throw createEdgeFunctionErrorResponse(
            errorData.error?.message || 'Export generation failed',
            response.status,
            'useExportTranslations'
          );
        }
        throw createEdgeFunctionErrorResponse('Export generation failed', response.status, 'useExportTranslations');
      }

      // Handle successful ZIP response
      const blob = await response.blob();

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `export-${projectId}-${timestamp}.zip`;

      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}
```

### Step 9: Write Unit Tests

**Testing Strategy:**

- Use Vitest with Testing Library for comprehensive test coverage
- Co-locate tests with source files (`Hook.test.ts` next to `Hook.ts`)
- Mock Supabase client and Edge Function calls using test utilities from `src/test/`
- Test both success and error scenarios with export edge cases
- Verify file download behavior and error handling
- Aim for 90% coverage threshold as per project requirements

**Create `src/features/export/api/useExportTranslations/useExportTranslations.test.ts`:**

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
