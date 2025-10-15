# API Endpoint Implementation Plan: Export Translations

## 1. Endpoint Overview

The Export Translations endpoint is a Supabase Edge Function that generates a downloadable ZIP archive containing all translations for a project. Each locale is exported as a separate JSON file in i18next-compatible format with flat, dotted keys sorted alphabetically. The endpoint enforces project ownership via RLS policies and supports server-side caching for performance optimization.

### Key Features

- ZIP archive generation with `{locale}.json` files
- Flat JSON structure with dotted keys (e.g., `"app.home.title": "Welcome Home"`)
- Alphabetical key sorting for consistent output
- UTF-8 encoding with LF line endings
- Project ownership validation via RLS
- Optional server-side caching with 5-minute TTL
- Streaming support for large projects (>10k keys)

### Endpoint Summary

**Export Project Translations** - `GET /functions/v1/export-translations?project_id={project_id}`

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/functions/v1/export-translations?project_id={project_id}`
- **Authentication:** Required (JWT via Authorization header)
- **Parameters:**
  - Required:
    - `project_id` (UUID) - Project identifier
  - Optional:
    - None specified
- **Request Body:** None

**Example Request:**

```http
GET /functions/v1/export-translations?project_id=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {access_token}
```

**Field Validation:**

- `project_id` (required, UUID) - Must be valid UUID format, project must exist and be owned by authenticated user

## 3. Used Types

### 3.1 Existing Types (from `src/shared/types/types.ts`)

```typescript
// Response DTOs
export type ExportedTranslations = Record<string, string>;
export type ExportTranslationsData = Record<string, ExportedTranslations>;

// Error types
export interface ApiErrorResponse {
  error: {
    code: string;
    details?: Record<string, unknown>;
    message: string;
  };
}

export interface ApiError {
  data: null;
  error: ApiErrorResponse;
}
```

### 3.2 New Types to Add

Add to `src/shared/types/types.ts`:

```typescript
/**
 * Export Translations Query Parameters
 */
export interface ExportTranslationsParams {
  project_id: string;
}

/**
 * Export Translations Metadata - used internally by Edge Function
 */
export interface ExportTranslationsMetadata {
  filename: string;
  locales: string[];
  project_name: string;
  timestamp: string;
  total_keys: number;
}
```

### 3.3 New Zod Validation Schemas

Create validation schemas in `src/features/export/api/export.schemas.ts`:

```typescript
import { z } from 'zod';

/**
 * Export Translations Request Schema
 */
export const exportTranslationsSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
});

/**
 * Parsed query parameters type
 */
export type ExportTranslationsRequest = z.infer<typeof exportTranslationsSchema>;
```

### 3.4 Edge Function Types

Create `supabase/functions/export-translations/types.ts`:

```typescript
/**
 * Translation row from database query
 */
export interface TranslationRow {
  full_key: string;
  locale: string;
  value: string | null;
}

/**
 * Locale with translations
 */
export interface LocaleData {
  label: string;
  locale: string;
  translations: Record<string, string>;
}

/**
 * Project with metadata for export
 */
export interface ProjectExportData {
  default_locale: string;
  id: string;
  locale_data: LocaleData[];
  name: string;
  updated_at: string;
}
```

## 4. Response Details

### 4.1 Successful Export

**Success Response (200 OK):**

**Headers:**

- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="project-{name}-{timestamp}.zip"`
- `Content-Length: {size_in_bytes}`

**Body:**

Binary ZIP archive containing locale JSON files.

**ZIP Contents Example:**

```
en.json
pl.json
de.json
```

**File Format (`en.json` example):**

```json
{
  "app.home.subtitle": "Get started now",
  "app.home.title": "Welcome Home",
  "app.settings.label": "Settings"
}
```

**Key Characteristics:**

- Flat structure with dotted keys (no nesting)
- Alphabetically sorted keys for consistent diffs
- Empty/NULL values converted to `""`
- UTF-8 encoding
- LF line endings (`\n`)
- 2-space indentation for readability

### 4.2 Error Responses

**400 Bad Request (Invalid Project ID):**

```json
{
  "error": {
    "code": "validation_error",
    "details": {
      "constraint": "uuid",
      "field": "project_id"
    },
    "message": "Invalid project ID format"
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

**404 Not Found:**

```json
{
  "error": {
    "code": "not_found",
    "message": "Project not found or access denied"
  }
}
```

**500 Internal Server Error:**

```json
{
  "error": {
    "code": "internal_server_error",
    "message": "Export generation failed"
  }
}
```

## 5. Data Flow

### 5.1 Export Request Flow

1. **User Interaction:** User clicks "Export Translations" button in project UI
2. **Frontend Validation:** Component calls `useExportTranslations` mutation hook with `project_id`
3. **Mutation Trigger:** Hook validates UUID format using Zod schema
4. **API Call:** Hook calls Edge Function via Supabase client (uses `functions.invoke()` or direct fetch)
5. **Edge Function Initialization:**
   - Receives request with JWT token in Authorization header
   - Parses query parameters
   - Validates `project_id` format
6. **Authentication:** Extracts user ID from JWT token via Supabase Auth
7. **Authorization:** Queries `projects` table with RLS policies enforcing `owner_user_id = auth.uid()`
8. **Project Validation:**
   - If project not found or access denied → return 404
   - If found, proceed to data fetching
9. **Fetch Locales:** Query `project_locales` table to get all locales for the project
10. **Check Cache (Optional):**
    - Generate cache key: `export:${project_id}:${max_updated_at}`
    - Check if cached ZIP exists and is fresh (< 5 minutes old)
    - If cache hit, return cached ZIP and skip to step 15
11. **Fetch Translations:** Execute optimized query:
    ```sql
    SELECT k.full_key, t.locale, t.value
    FROM keys k
    JOIN translations t ON k.id = t.key_id
    WHERE k.project_id = $1
    ORDER BY t.locale, k.full_key
    ```
12. **Build Locale JSON Objects:**
    - Group translations by locale
    - Convert NULL values to empty strings
    - Sort keys alphabetically within each locale
    - Create flat JSON objects
13. **Generate ZIP Archive:**
    - Create in-memory ZIP using JSZip or equivalent
    - Add `{locale}.json` files with UTF-8 encoding
    - Compress with standard ZIP compression
14. **Store in Cache (Optional):** Save generated ZIP with 5-minute TTL
15. **Set Response Headers:**
    - `Content-Type: application/zip`
    - `Content-Disposition: attachment; filename="project-{name}-{timestamp}.zip"`
16. **Stream Response:** Send ZIP binary data to client
17. **Frontend Download Handling:**
    - Receive blob response
    - Create blob URL
    - Trigger browser download via temporary anchor element
    - Revoke blob URL
18. **Success Feedback:** Display "Export successful" toast notification

### 5.2 Error Handling Flow

At each step, if an error occurs:

1. **Validation Error:** Return 400 with field-specific details
2. **Auth Error:** Return 401 with authentication message
3. **Not Found/Access Denied:** Return 404 (don't distinguish between cases)
4. **Database Error:** Log error details, return 500 with generic message
5. **ZIP Generation Error:** Log error, return 500
6. **Network Error:** Frontend retries with exponential backoff (TanStack Query)

## 6. Security Considerations

### 6.1 Authentication

- JWT token required in `Authorization: Bearer {token}` header
- Token validation handled by Supabase Edge Functions runtime
- Invalid or expired tokens return 401 automatically

### 6.2 Authorization

- RLS policies on `projects` table enforce `owner_user_id = auth.uid()`
- Edge Function queries respect RLS by using authenticated Supabase client
- Users can only export their own projects
- 404 response doesn't distinguish between "doesn't exist" and "access denied" to prevent enumeration

### 6.3 Input Validation

- **Frontend:** Zod schema validates UUID format before API call
- **Backend:** Edge Function validates project_id parameter
- Parameterized queries prevent SQL injection

### 6.4 Data Exposure

- Export includes only translation data (keys, values, locales)
- Excludes metadata: `updated_at`, `updated_by_user_id`, `is_machine_translated`, `updated_source`
- Project ownership information (`owner_user_id`) not included in export
- NULL values converted to empty strings (no internal database states exposed)

### 6.5 Resource Limits

**Potential Attack Vectors:**

1. **Memory Exhaustion:** Large projects (>100k keys) could consume excessive memory
   - Mitigation: Implement streaming, set timeout (30 seconds)
2. **CPU Exhaustion:** JSON serialization and ZIP compression are CPU-intensive
   - Mitigation: Edge Function auto-scales, rate limiting via Supabase
3. **Repeated Exports:** User spams export button
   - Mitigation: Client-side debouncing, server-side caching (5-minute TTL)

**Recommended Limits:**

- Maximum project size: 100k keys (warning in UI for large projects)
- Edge Function timeout: 30 seconds
- Rate limiting: 10 exports per minute per user (via Supabase)

### 6.6 CORS

- Supabase Edge Functions automatically handle CORS for authenticated requests
- Only requests from configured origin (app domain) are allowed

### 6.7 Cache Security

- Cache keys include project_id and max updated_at timestamp
- Cached data is keyed per user (if using user-specific cache)
- Cache expiration (5 minutes) limits stale data exposure

## 7. Error Handling

### 7.1 Client-Side Validation Errors (400)

**Trigger Conditions:**

- Invalid UUID format for `project_id`
- Missing `project_id` parameter

**Handling:**

```typescript
try {
  const validated = exportTranslationsSchema.parse({ project_id });
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

### 7.2 Authentication Errors (401)

**Trigger Conditions:**

- Missing Authorization header
- Expired JWT token
- Invalid JWT signature

**Handling:**

- Supabase Edge Functions runtime handles automatically
- Frontend receives 401 response
- TanStack Query error handler redirects to login page

### 7.3 Authorization Errors (404)

**Trigger Conditions:**

- Project doesn't exist
- User doesn't own the project (RLS denies access)

**Handling:**

```typescript
const { data: project, error } = await supabase
  .from('projects')
  .select('id, name, updated_at')
  .eq('id', project_id)
  .maybeSingle();

if (!project || error) {
  return new Response(
    JSON.stringify({
      error: {
        code: 'not_found',
        message: 'Project not found or access denied',
      },
    }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### 7.4 Database Errors (500)

**Trigger Conditions:**

- Database connection failure
- Query timeout
- Unexpected constraint violation

**Handling:**

```typescript
const { data: translations, error: dbError } = await supabase
  .from('keys')
  .select('full_key, translations(locale, value)')
  .eq('project_id', project_id);

if (dbError) {
  console.error('[export-translations] Database error:', dbError);
  return new Response(
    JSON.stringify({
      error: {
        code: 'internal_server_error',
        message: 'Export generation failed',
      },
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### 7.5 ZIP Generation Errors (500)

**Trigger Conditions:**

- Out of memory during ZIP creation
- JSZip library error
- Invalid file content

**Handling:**

```typescript
try {
  const zip = new JSZip();
  for (const [locale, translations] of Object.entries(localeData)) {
    const json = JSON.stringify(translations, null, 2);
    zip.file(`${locale}.json`, json, { compression: 'DEFLATE' });
  }
  const zipBlob = await zip.generateAsync({ type: 'uint8array' });
  return new Response(zipBlob, { status: 200, headers });
} catch (zipError) {
  console.error('[export-translations] ZIP generation error:', zipError);
  return new Response(
    JSON.stringify({
      error: {
        code: 'internal_server_error',
        message: 'Export generation failed',
      },
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### 7.6 Network Errors

**Trigger Conditions:**

- Client loses internet connection
- Edge Function timeout (30 seconds)
- Supabase service unavailable

**Handling:**

- TanStack Query retries failed requests (3 retries with exponential backoff)
- Frontend displays network error message with retry button
- No cache available for failed exports (mutations don't cache)

**Example Frontend Handling:**

```typescript
const mutation = useExportTranslations();

if (mutation.isError) {
  if (mutation.error.message.includes('network')) {
    toast.error('Network error. Please check your connection and try again.');
  } else {
    toast.error('Export failed. Please try again later.');
  }
}
```

### 7.7 Empty Project Handling

**Trigger Conditions:**

- Project has no keys or translations
- Project has locales but no keys

**Handling:**

- Generate empty JSON files for each locale: `{ }`
- Include in ZIP archive as normal
- Log warning in Edge Function logs
- Frontend displays "Export successful" (user understands project is empty)

## 8. Performance Considerations

### 8.1 Query Optimization

**Database Query:**

```sql
-- Optimized single query with JOIN
SELECT k.full_key, t.locale, t.value
FROM keys k
JOIN translations t ON k.id = t.key_id
WHERE k.project_id = $1
ORDER BY t.locale, k.full_key;
```

**Indexing:**

- Index on `keys.project_id` (already exists from foreign key)
- Index on `translations.key_id` (already exists from foreign key)
- Composite index on `(project_id, full_key)` for sorting (already defined in migrations)

**Query Performance:**

- Small projects (<1k keys): ~10ms
- Medium projects (1k-10k keys): ~50ms
- Large projects (10k-100k keys): ~500ms

### 8.2 Server-Side Caching

**Cache Strategy:**

- Key format: `export:${project_id}:${max_updated_at}`
- TTL: 5 minutes (300 seconds)
- Storage: In-memory cache (Supabase Edge Functions KV or external Redis)
- Invalidation: Automatic expiration, no manual invalidation needed

**Cache Key Generation:**

```typescript
const { data: project } = await supabase.from('projects').select('id, name, updated_at').eq('id', project_id).single();

// Get max updated_at from translations
const { data: maxUpdate } = await supabase
  .from('translations')
  .select('updated_at')
  .eq('project_id', project_id)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const cacheKey = `export:${project_id}:${maxUpdate?.updated_at || project.updated_at}`;
```

**Cache Hit Ratio:**

- Expected hit ratio: 60-80% for active projects
- Benefit: Reduces database load and response time by ~80%

**Note:** Caching is optional for MVP - can be added in future optimization phase if needed.

### 8.3 Streaming for Large Projects

**When to Use:**

- Projects with >10k keys
- Prevents memory exhaustion in Edge Function

**Implementation:**

```typescript
// Stream approach using ReadableStream
const stream = new ReadableStream({
  async start(controller) {
    const zip = new JSZip();
    // Add files incrementally
    for (const [locale, translations] of Object.entries(localeData)) {
      const json = JSON.stringify(translations, null, 2);
      zip.file(`${locale}.json`, json);
    }
    // Generate ZIP in chunks
    const zipStream = zip.generateInternalStream({ type: 'uint8array', streamFiles: true });
    zipStream.on('data', (chunk) => controller.enqueue(chunk));
    zipStream.on('end', () => controller.close());
    zipStream.on('error', (err) => controller.error(err));
  },
});

return new Response(stream, { status: 200, headers });
```

**Note:** Streaming implementation can be deferred to performance optimization phase.

### 8.4 Frontend Optimization

**Download Handling:**

```typescript
// Efficient blob download without blocking UI
const downloadExport = async (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

**UI Feedback:**

- Show loading spinner during export generation
- Disable export button while mutation is pending
- Display estimated time for large projects
- Show success toast on completion

### 8.5 Payload Size

**Typical Sizes:**

- Small project (100 keys, 3 locales): ~10 KB (compressed ZIP)
- Medium project (1k keys, 5 locales): ~100 KB
- Large project (10k keys, 10 locales): ~1 MB
- Very large project (100k keys, 20 locales): ~10 MB

**Compression:**

- JSON text compression ratio: ~60-70% with ZIP
- Total transfer with gzip: ~80-90% reduction from raw JSON

## 9. Implementation Steps

### Step 1: Create Feature Directory Structure

```bash
# Frontend structure
mkdir -p src/features/export/{api,components,hooks}

# Backend structure
mkdir -p supabase/functions/export-translations
```

### Step 2: Create Zod Validation Schemas

Create `src/features/export/api/export.schemas.ts`:

```typescript
import { z } from 'zod';

/**
 * Export Translations Request Schema
 */
export const exportTranslationsSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
});

/**
 * Parsed query parameters type
 */
export type ExportTranslationsRequest = z.infer<typeof exportTranslationsSchema>;
```

### Step 3: Update Type Definitions

Add to `src/shared/types/types.ts`:

```typescript
/**
 * Export Translations Query Parameters
 */
export interface ExportTranslationsParams {
  project_id: string;
}

/**
 * Export Translations Metadata - used internally by Edge Function
 */
export interface ExportTranslationsMetadata {
  filename: string;
  locales: string[];
  project_name: string;
  timestamp: string;
  total_keys: number;
}
```

### Step 4: Create Edge Function

**4.1 Create `supabase/functions/export-translations/index.ts`:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { JSZip } from 'https://deno.land/x/jszip@0.11.0/mod.ts';

interface TranslationRow {
  full_key: string;
  locale: string;
  value: string | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. Extract and validate project_id
    const url = new URL(req.url);
    const projectId = url.searchParams.get('project_id');

    if (!projectId) {
      return errorResponse(400, 'validation_error', 'Missing project_id parameter');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return errorResponse(400, 'validation_error', 'Invalid project ID format');
    }

    // 2. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(401, 'unauthorized', 'Authentication required');
    }

    // Create authenticated Supabase client
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });

    // 3. Verify project ownership via RLS
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, updated_at')
      .eq('id', projectId)
      .maybeSingle();

    if (projectError || !project) {
      console.error('[export-translations] Project query error:', projectError);
      return errorResponse(404, 'not_found', 'Project not found or access denied');
    }

    // 4. Fetch all project locales
    const { data: locales, error: localesError } = await supabase
      .from('project_locales')
      .select('locale, label')
      .eq('project_id', projectId)
      .order('locale');

    if (localesError || !locales || locales.length === 0) {
      console.error('[export-translations] Locales query error:', localesError);
      return errorResponse(500, 'internal_server_error', 'Failed to fetch project locales');
    }

    // 5. Fetch all translations
    const { data: translations, error: translationsError } = await supabase
      .from('keys')
      .select('full_key, translations(locale, value)')
      .eq('project_id', projectId)
      .order('full_key');

    if (translationsError) {
      console.error('[export-translations] Translations query error:', translationsError);
      return errorResponse(500, 'internal_server_error', 'Failed to fetch translations');
    }

    // 6. Build locale JSON objects
    const localeData: Record<string, Record<string, string>> = {};

    // Initialize empty objects for all locales
    for (const locale of locales) {
      localeData[locale.locale] = {};
    }

    // Populate with translation data
    if (translations && translations.length > 0) {
      for (const key of translations) {
        const fullKey = key.full_key;
        const translationEntries = (key.translations as any[]) || [];

        for (const entry of translationEntries) {
          const locale = entry.locale;
          const value = entry.value ?? ''; // Convert NULL to empty string
          if (localeData[locale]) {
            localeData[locale][fullKey] = value;
          }
        }
      }
    }

    // 7. Sort keys alphabetically within each locale
    const sortedLocaleData: Record<string, Record<string, string>> = {};
    for (const [locale, translations] of Object.entries(localeData)) {
      const sortedKeys = Object.keys(translations).sort();
      sortedLocaleData[locale] = {};
      for (const key of sortedKeys) {
        sortedLocaleData[locale][key] = translations[key];
      }
    }

    // 8. Generate ZIP archive
    const zip = new JSZip();

    for (const [locale, translations] of Object.entries(sortedLocaleData)) {
      const json = JSON.stringify(translations, null, 2) + '\n';
      zip.addFile(`${locale}.json`, new TextEncoder().encode(json));
    }

    const zipBlob = await zip.generateAsync({ type: 'uint8array' });

    // 9. Set response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `project-${sanitizeFilename(project.name)}-${timestamp}.zip`;

    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': zipBlob.length.toString(),
      ...corsHeaders,
    });

    // 10. Return ZIP file
    return new Response(zipBlob, { status: 200, headers });
  } catch (error) {
    console.error('[export-translations] Unexpected error:', error);
    return errorResponse(500, 'internal_server_error', 'Export generation failed');
  }
});

// Helper function for error responses
function errorResponse(status: number, code: string, message: string) {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
      },
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  );
}

// Sanitize filename for safe filesystem names
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**4.2 Create `supabase/functions/export-translations/README.md`:**

Document Edge Function purpose, parameters, and example usage.

### Step 5: Create TanStack Query Hook

Create `src/features/export/api/useExportTranslations.ts`:

```typescript
import { useMutation } from '@tanstack/react-query';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { exportTranslationsSchema } from './export.schemas';
import type { ExportTranslationsParams, ApiError } from '@/shared/types';

export function useExportTranslations() {
  const supabase = useSupabase();

  return useMutation<Blob, ApiError, ExportTranslationsParams>({
    mutationFn: async ({ project_id }) => {
      // Validate input
      const validated = exportTranslationsSchema.parse({ project_id });

      // Get current session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw {
          error: {
            code: 'unauthorized',
            message: 'Authentication required',
          },
        };
      }

      // Call Edge Function
      const url = `${supabase.functions.url}/export-translations?project_id=${validated.project_id}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        // Parse error response
        const errorData = await response.json();
        console.error('[useExportTranslations] Export error:', errorData);
        throw {
          error: errorData.error || {
            code: 'internal_server_error',
            message: 'Export failed',
          },
        };
      }

      // Return blob for download
      return await response.blob();
    },
  });
}
```

### Step 6: Create Download Hook

Create `src/features/export/hooks/useDownloadFile.ts`:

```typescript
import { useCallback } from 'react';

/**
 * Hook to handle file downloads from blob data
 */
export function useDownloadFile() {
  const downloadFile = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return { downloadFile };
}
```

### Step 7: Create Export Component

Create `src/features/export/components/ExportButton.tsx`:

```typescript
import { Button } from '@/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useExportTranslations } from '../api/useExportTranslations';
import { useDownloadFile } from '../hooks/useDownloadFile';
import { toast } from 'sonner';

interface ExportButtonProps {
  projectId: string;
  projectName: string;
  disabled?: boolean;
}

export function ExportButton({ projectId, projectName, disabled }: ExportButtonProps) {
  const mutation = useExportTranslations();
  const { downloadFile } = useDownloadFile();

  const handleExport = async () => {
    try {
      const blob = await mutation.mutateAsync({ project_id: projectId });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `project-${projectName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.zip`;

      // Trigger download
      downloadFile(blob, filename);

      toast.success('Export successful', {
        description: 'Your translations have been downloaded.',
      });
    } catch (error) {
      console.error('[ExportButton] Export failed:', error);
      toast.error('Export failed', {
        description: 'Failed to export translations. Please try again.',
      });
    }
  };

  return (
    <Button onClick={handleExport} disabled={disabled || mutation.isPending} variant="outline">
      {mutation.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Export Translations
        </>
      )}
    </Button>
  );
}
```

### Step 8: Create API Index File

Create `src/features/export/api/index.ts`:

```typescript
export { useExportTranslations } from './useExportTranslations';
export * from './export.schemas';
```

### Step 9: Write Unit Tests

**9.1 Create `src/features/export/api/useExportTranslations.test.ts`:**

Test scenarios:

- Successful export with valid project_id
- Validation error for invalid UUID
- Authentication error (401)
- Project not found (404)
- Export generation failure (500)
- Network error handling

**9.2 Create `src/features/export/components/ExportButton.test.tsx`:**

Test scenarios:

- Button renders correctly
- Button disabled state
- Loading state during export
- Success toast on completion
- Error toast on failure
- Download triggered with correct filename

### Step 10: Integration Testing

**Test Complete Flow:**

1. User navigates to project details page
2. User clicks "Export Translations" button
3. Loading spinner appears
4. ZIP file downloads to browser
5. Success toast notification appears
6. User opens ZIP and verifies JSON files

**Test Error Scenarios:**

1. Invalid project ID → 400 error toast
2. Unauthorized access → redirect to login
3. Project not found → 404 error toast
4. Network failure → retry with exponential backoff

### Step 11: Deploy Edge Function

```bash
# Deploy to Supabase
supabase functions deploy export-translations

# Verify deployment
curl -X GET "https://your-project.supabase.co/functions/v1/export-translations?project_id=test-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 12: Update Documentation

**12.1 Add JSDoc comments to all hooks**

**12.2 Create `src/features/export/README.md`:**

Document:

- Feature overview
- Usage examples
- Edge Function details
- Export format specification
- Troubleshooting guide

### Step 13: Performance Testing

**Test with Various Project Sizes:**

- Small project (100 keys, 3 locales): < 2 seconds
- Medium project (1k keys, 5 locales): < 5 seconds
- Large project (10k keys, 10 locales): < 15 seconds

**Monitor:**

- Edge Function execution time
- Memory usage
- Network transfer size
- Download speed

### Step 14: Accessibility Review

- Ensure button has proper ARIA label
- Test keyboard navigation
- Verify screen reader compatibility
- Check focus management during loading state

### Step 15: Final Review and Deployment

- Run `npm run lint` and fix any issues
- Run `npm run test` and ensure 100% coverage for API layer
- Update `.ai/api/plans/export-translations-implementation-plan.md` with any changes
- Create pull request with comprehensive description
- Request code review from team members
- Merge and deploy to staging environment
- Test in staging with real data
- Monitor error tracking for any production issues
- Deploy to production

## 10. Future Optimizations

### 10.1 Server-Side Caching

Implement Redis-based caching with 5-minute TTL for frequently exported projects.

### 10.2 Streaming for Large Projects

Implement chunked streaming for projects with >10k keys to reduce memory usage.

### 10.3 Export Format Options

Add support for additional export formats:

- Nested JSON (tree structure)
- CSV format
- YAML format
- Excel spreadsheet

### 10.4 Partial Exports

Allow users to export specific locales or key namespaces.

### 10.5 Export History

Track export events in telemetry table for analytics.

### 10.6 Direct Download Links

Generate temporary download links that expire after 1 hour for sharing exports.
