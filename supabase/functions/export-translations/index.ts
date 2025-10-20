import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
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

type ExportedTranslations = Record<string, string>;

type ExportTranslationsData = Record<string, ExportedTranslations>;

// =============================================================================
// Validation Schema
// =============================================================================

const exportRequestSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
});

// =============================================================================
// Helper Functions
// =============================================================================

function createResponse(status: number, body: object | Uint8Array, headers: HeadersInit = {}) {
  const defaultHeaders = { 'Content-Type': 'application/json' };
  const finalHeaders = { ...defaultHeaders, ...headers };

  const responseBody = body instanceof Uint8Array ? body : JSON.stringify(body);

  return new Response(responseBody, {
    headers: finalHeaders,
    status,
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

    // ==========================================================================
    // Authentication & Authorization
    // ==========================================================================

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
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
        type: 'uint8array',
      });

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const sanitizedProjectName = project.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      const filename = `project-${sanitizedProjectName}-${timestamp}.zip`;

      // Return ZIP file
      return createResponse(200, zipBuffer, {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/zip',
      });
    } catch (zipError) {
      console.error('[export-translations] ZIP generation error:', zipError);
      return createResponse(500, errorResponse(500, 'Failed to generate export file'));
    }
  } catch (error) {
    console.error('[export-translations] Unexpected error:', error);
    return createResponse(500, errorResponse(500, 'Export generation failed'));
  }
}

// =============================================================================
// Deno HTTP Handler
// =============================================================================

Deno.serve(handleExportRequest);
