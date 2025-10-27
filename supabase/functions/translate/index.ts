import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// =============================================================================
// Constants
// =============================================================================

const RATE_LIMIT_JOBS_PER_MINUTE = 10;
const RATE_LIMIT_CONCURRENT_JOBS_PER_USER = 3;
const RATE_LIMIT_WINDOW_MINUTES = 60 * 1000; // 1 minute in ms

const TRANSLATION_MAX_LENGTH = 250;
const ERROR_MESSAGE_MAX_LENGTH = 255;
const DEFAULT_MAX_TOKENS = 256;

// Error codes enum for translation job items
const enum TranslationErrorCode {
  API_ERROR = 'API_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MODEL_ERROR = 'MODEL_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  SOURCE_NOT_FOUND = 'SOURCE_NOT_FOUND',
  TRANSLATION_ERROR = 'TRANSLATION_ERROR',
}

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

interface CreateTranslationJobRequest {
  key_ids: string[];
  mode: 'all' | 'selected' | 'single';
  params?: null | {
    max_tokens?: number;
    model?: string;
    provider?: string;
    temperature?: number;
  };
  project_id: string;
  target_locale: string;
}

interface CreateTranslationJobResponse {
  job_id: string;
  message: string;
  status: 'pending';
}

type SupabaseClient = ReturnType<typeof createClient>;

// =============================================================================
// Validation Schema
// =============================================================================

const requestSchema = z
  .object({
    key_ids: z.array(z.string().uuid()),
    mode: z.enum(['all', 'selected', 'single']),
    params: z
      .object({
        max_tokens: z.number().int().min(1).max(4096).optional(),
        model: z.string().optional(),
        provider: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
      })
      .optional()
      .nullable(),
    project_id: z.string().uuid(),
    target_locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'all' && data.key_ids.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'All mode should not include specific key IDs',
        path: ['key_ids'],
      });
    }
    if (data.mode === 'selected' && data.key_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selected mode requires at least one key ID',
        path: ['key_ids'],
      });
    }
    if (data.mode === 'single' && data.key_ids.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Single mode requires exactly one key ID',
        path: ['key_ids'],
      });
    }
  });

// =============================================================================
// Helper Functions
// =============================================================================

function createResponse(status: number, body: object) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
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

async function handleTranslateRequest(req: Request): Promise<Response> {
  try {
    // Validate request method
    if (req.method !== 'POST') {
      return createResponse(405, errorResponse(405, 'Method not allowed'));
    }

    // Parse request body
    let requestData: unknown;
    try {
      requestData = await req.json();
    } catch {
      return createResponse(400, errorResponse(400, 'Invalid JSON in request body'));
    }

    // Validate request schema
    let validatedData: CreateTranslationJobRequest;
    try {
      validatedData = requestSchema.parse(requestData);
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
      console.error('[translate] Missing Supabase configuration');
      return createResponse(500, errorResponse(500, 'Service configuration error'));
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    // Business Logic Validation
    // ==========================================================================

    // 1. Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, default_locale')
      .eq('id', validatedData.project_id)
      .eq('owner_user_id', userId)
      .maybeSingle();

    if (projectError) {
      console.error('[translate] Project fetch error:', projectError);
      return createResponse(500, errorResponse(500, 'Database operation failed'));
    }

    if (!project) {
      return createResponse(404, errorResponse(404, 'Project not found or access denied'));
    }

    // 2. Verify target locale exists and is not default
    if (validatedData.target_locale === project.default_locale) {
      return createResponse(
        400,
        errorResponse(400, 'Target locale cannot be the default locale', {
          constraint: 'custom',
          field: 'target_locale',
        })
      );
    }

    const { data: locales, error: localesError } = await supabase
      .from('project_locales')
      .select('locale')
      .eq('project_id', validatedData.project_id)
      .eq('locale', validatedData.target_locale);

    if (localesError) {
      console.error('[translate] Locales fetch error:', localesError);
      return createResponse(500, errorResponse(500, 'Database operation failed'));
    }

    if (!locales || locales.length === 0) {
      return createResponse(
        400,
        errorResponse(400, 'Target locale does not exist in project', {
          constraint: 'exists',
          field: 'target_locale',
        })
      );
    }

    // 3. Rate limiting checks
    const oneMinuteAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES).toISOString();

    // Check rate limits per user
    const { data: recentJobs, error: rateLimitError } = await supabase
      .from('translation_jobs')
      .select('id, created_at')
      .eq('project_id', validatedData.project_id)
      .gte('created_at', oneMinuteAgo);

    if (rateLimitError) {
      console.error('[translate] Rate limit check error:', rateLimitError);
      return createResponse(500, errorResponse(500, 'Database operation failed'));
    }

    // Rate limit: max jobs per minute per project
    if (recentJobs && recentJobs.length >= RATE_LIMIT_JOBS_PER_MINUTE) {
      return createResponse(429, errorResponse(429, 'Rate limit exceeded: too many jobs in the last minute'));
    }

    // Check concurrent jobs per user (across all projects)
    const { data: userProjects, error: userProjectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_user_id', userId);

    if (userProjectsError || !userProjects) {
      console.error('[translate] User projects fetch error:', userProjectsError);
      return createResponse(500, errorResponse(500, 'Database operation failed'));
    }

    const projectIds = userProjects.map((p) => p.id);

    const { data: userActiveJobs, error: userActiveError } = await supabase
      .from('translation_jobs')
      .select('id')
      .in('project_id', projectIds)
      .in('status', ['pending', 'running']);

    if (userActiveError) {
      console.error('[translate] User active jobs check error:', userActiveError);
      return createResponse(500, errorResponse(500, 'Database operation failed'));
    }

    // Rate limit: max concurrent jobs per user
    if (userActiveJobs && userActiveJobs.length >= RATE_LIMIT_CONCURRENT_JOBS_PER_USER) {
      return createResponse(429, errorResponse(429, 'Rate limit exceeded: too many concurrent jobs'));
    }

    // 5. Check for active jobs (prevent concurrent translation jobs per project)
    const { data: activeJobs, error: activeJobsError } = await supabase
      .from('translation_jobs')
      .select('id')
      .eq('project_id', validatedData.project_id)
      .in('status', ['pending', 'running'])
      .limit(1);

    if (activeJobsError) {
      console.error('[translate] Active jobs check error:', activeJobsError);
      return createResponse(500, errorResponse(500, 'Database operation failed'));
    }

    if (activeJobs && activeJobs.length > 0) {
      return createResponse(409, errorResponse(409, 'Another translation job is already active for this project'));
    }

    // ==========================================================================
    // Job Initialization
    // ==========================================================================

    // 6. Get keys to translate based on mode (before creating job)
    let keyIds: string[] = [];

    if (validatedData.mode === 'all') {
      const { data: allKeys, error: keysError } = await supabase
        .from('keys')
        .select('id')
        .eq('project_id', validatedData.project_id);

      if (keysError) {
        console.error('[translate] Keys fetch error:', keysError);
        return createResponse(500, errorResponse(500, 'Failed to fetch keys'));
      }

      keyIds = (allKeys || []).map((k) => k.id);
    } else {
      keyIds = validatedData.key_ids;
    }

    if (keyIds.length === 0) {
      // No keys to translate - return error
      return createResponse(400, errorResponse(400, 'No keys available for translation'));
    }

    // 7. Create translation_jobs record with total_keys set
    const { data: jobData, error: jobCreateError } = await supabase
      .from('translation_jobs')
      .insert({
        mode: validatedData.mode,
        model: validatedData.params?.model || null,
        params: validatedData.params
          ? {
              max_tokens: validatedData.params.max_tokens,
              temperature: validatedData.params.temperature,
            }
          : null,
        project_id: validatedData.project_id,
        provider: validatedData.params?.provider || null,
        source_locale: project.default_locale,
        status: 'pending',
        target_locale: validatedData.target_locale,
        total_keys: keyIds.length,
      })
      .select('id')
      .single();

    if (jobCreateError) {
      console.error('[translate] Job creation error:', jobCreateError);
      return createResponse(500, errorResponse(500, 'Failed to create translation job'));
    }

    if (!jobData) {
      return createResponse(500, errorResponse(500, 'Failed to create translation job'));
    }

    const jobId = jobData.id;

    // 8. Create translation_job_items records
    const jobItems = keyIds.map((keyId) => ({
      job_id: jobId,
      key_id: keyId,
      status: 'pending' as const,
    }));

    const { error: itemsError } = await supabase.from('translation_job_items').insert(jobItems);

    if (itemsError) {
      console.error('[translate] Job items creation error:', itemsError);
      // Rollback job creation
      await supabase.from('translation_jobs').delete().eq('id', jobId);
      return createResponse(500, errorResponse(500, 'Failed to create job items'));
    }

    // ==========================================================================
    // Background Processing (Non-blocking)
    // ==========================================================================

    // 9. Start background job processing without waiting
    processTranslationJobInBackground(
      jobId,
      validatedData.project_id,
      keyIds,
      project.default_locale,
      validatedData.target_locale,
      validatedData.mode,
      validatedData.params,
      userId
    ).catch((error) => {
      console.error('[translate] Background processing error:', error);
    });

    // 10. Return 202 Accepted immediately
    return createResponse(202, {
      job_id: jobId,
      message: 'Translation job created',
      status: 'pending',
    } as CreateTranslationJobResponse);
  } catch (error) {
    console.error('[translate] Unexpected error:', error);
    return createResponse(500, errorResponse(500, 'Internal server error'));
  }
}

// =============================================================================
// Background Processing
// =============================================================================

async function processTranslationJobInBackground(
  jobId: string,
  projectId: string,
  keyIds: string[],
  sourceLocale: string,
  targetLocale: string,
  mode: 'all' | 'selected' | 'single',
  params?: null | {
    max_tokens?: number;
    model?: string;
    provider?: string;
    temperature?: number;
  }
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[processTranslationJob] Missing Supabase configuration');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Update job status to running
    await supabase
      .from('translation_jobs')
      .update({
        started_at: new Date().toISOString(),
        status: 'running',
      })
      .eq('id', jobId);

    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    const openrouterModel = Deno.env.get('OPENROUTER_MODEL') || 'google/gemini-2.5-flash-lite';

    if (!openrouterApiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    let completedCount = 0;
    let failedCount = 0;

    // Process each key
    for (const keyId of keyIds) {
      try {
        // Fetch source translation
        const { data: sourceTranslation, error: sourceError } = await supabase
          .from('translations')
          .select('value')
          .eq('key_id', keyId)
          .eq('locale', sourceLocale)
          .single();

        if (sourceError || !sourceTranslation) {
          console.warn(`[processTranslationJob] Source translation not found for key ${keyId}`);
          await updateJobItem(
            supabase,
            jobId,
            keyId,
            'skipped',
            TranslationErrorCode.SOURCE_NOT_FOUND,
            'Source translation not found'
          );
          failedCount++;
          continue;
        }

        const sourceValue = sourceTranslation.value;

        // Call OpenRouter API for translation
        const translatedValue = await translateWithOpenRouter(
          sourceValue,
          sourceLocale,
          targetLocale,
          openrouterApiKey,
          openrouterModel,
          params
        );

        // Validate translation: max 250 chars, no newlines
        if (!translatedValue || translatedValue.length === 0) {
          throw new Error('Invalid translation: empty or null');
        }
        if (translatedValue.length > TRANSLATION_MAX_LENGTH) {
          throw new Error(`Invalid translation: too long (max ${TRANSLATION_MAX_LENGTH} characters)`);
        }
        if (translatedValue.includes('\n')) {
          throw new Error('Invalid translation: contains newlines');
        }

        // Upsert translation
        const { error: upsertError } = await supabase.from('translations').upsert(
          {
            is_machine_translated: true,
            key_id: keyId,
            locale: targetLocale,
            project_id: projectId,
            updated_by_user_id: null,
            updated_source: 'system',
            value: translatedValue,
          },
          { onConflict: 'project_id,key_id,locale' }
        );

        if (upsertError) {
          throw new Error(`Translation upsert failed: ${upsertError.message}`);
        }

        // Update job item status
        await updateJobItem(supabase, jobId, keyId, 'completed', null, null);
        completedCount++;
      } catch (error) {
        console.error(`[processTranslationJob] Error translating key ${keyId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Parse error message to extract error code (format: "code:status:message")
        let errorCode = TranslationErrorCode.TRANSLATION_ERROR;
        let cleanErrorMessage = errorMessage;

        if (errorMessage.includes(':')) {
          const parts = errorMessage.split(':');
          if (parts.length >= 3) {
            errorCode = parts[0].toUpperCase(); // Convert to uppercase for consistency
            cleanErrorMessage = `${parts[1]}: ${parts[2]}`; // "status: message"
          }
        }

        await updateJobItem(
          supabase,
          jobId,
          keyId,
          'failed',
          errorCode,
          cleanErrorMessage.substring(0, ERROR_MESSAGE_MAX_LENGTH)
        );
        failedCount++;
      }
    }

    // Update job completion status
    const finalStatus = failedCount > 0 && completedCount === 0 ? 'failed' : 'completed';
    await supabase
      .from('translation_jobs')
      .update({
        completed_keys: completedCount,
        failed_keys: failedCount,
        finished_at: new Date().toISOString(),
        status: finalStatus,
      })
      .eq('id', jobId);

    // Log telemetry with improved error handling
    const telemetryEvent = {
      event_name: 'translation_completed' as const,
      project_id: projectId,
      properties: {
        completed_keys: completedCount,
        failed_keys: failedCount,
        mode: mode,
        target_locale: targetLocale,
      },
    };

    try {
      const { error: telemetryError } = await supabase.from('telemetry_events').insert(telemetryEvent);

      if (telemetryError) {
        console.error('[processTranslationJob] Telemetry insert failed:', {
          completedCount,
          error: telemetryError,
          event: telemetryEvent,
          failedCount,
          jobId,
          projectId,
          totalKeys: keyIds.length,
        });
        // TODO: Consider adding retry logic or storing failed telemetry events
        // in a separate table for later processing
      } else {
        console.log('[processTranslationJob] Telemetry event logged successfully:', {
          completedKeys: completedCount,
          eventName: telemetryEvent.event_name,
          failedKeys: failedCount,
          jobId,
          projectId,
        });
      }
    } catch (err) {
      console.error('[processTranslationJob] Unexpected error during telemetry insert:', {
        error: err,
        event: telemetryEvent,
        jobId,
        projectId,
      });
    }
  } catch (error) {
    console.error('[processTranslationJob] Fatal error:', error);

    // Mark job as failed
    try {
      await supabase
        .from('translation_jobs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'failed',
        })
        .eq('id', jobId);
    } catch (err) {
      console.error('[processTranslationJob] Failed to mark job as failed:', err);
    }
  }
}

// =============================================================================
// Translation Function
// =============================================================================

async function translateWithOpenRouter(
  sourceValue: string,
  sourceLocale: string,
  targetLocale: string,
  apiKey: string,
  model: string,
  params?: null | {
    max_tokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const prompt = `You are a professional translator. Translate the following text from ${sourceLocale} to ${targetLocale}.

Source text: "${sourceValue}"

Provide ONLY the translated text, without any explanation, quotes, or additional text.`;

  const requestBody = {
    max_tokens: params?.max_tokens || DEFAULT_MAX_TOKENS,
    messages: [
      {
        content: prompt,
        role: 'user',
      },
    ],
    model,
    temperature: params?.temperature || 0.3,
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    body: JSON.stringify(requestBody),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorCode = errorData.error?.code || 'unknown_error';
    const errorMessage = errorData.error?.message || 'Unknown error';

    // Map OpenRouter error codes to application-specific error codes
    let appErrorCode: TranslationErrorCode;
    switch (errorCode) {
      case 'insufficient_quota':
      case 'rate_limit_exceeded':
        appErrorCode = TranslationErrorCode.RATE_LIMIT;
        break;
      case 'invalid_request':
      case 'validation_error':
        appErrorCode = TranslationErrorCode.INVALID_REQUEST;
        break;
      case 'model_disabled':
      case 'model_not_available':
      case 'model_not_found':
        appErrorCode = TranslationErrorCode.MODEL_ERROR;
        break;
      default:
        appErrorCode = TranslationErrorCode.API_ERROR;
    }

    throw new Error(`${appErrorCode}:${response.status}:${errorMessage}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error('Invalid response from OpenRouter API');
  }

  return data.choices[0].message.content.trim();
}

// =============================================================================
// Job Item Update
// =============================================================================

async function updateJobItem(
  supabase: SupabaseClient,
  jobId: string,
  keyId: string,
  status: 'completed' | 'failed' | 'pending' | 'skipped',
  errorCode: null | TranslationErrorCode,
  errorMessage: null | string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    error_code: errorCode,
    error_message: errorMessage,
    status,
    updated_at: new Date().toISOString(),
  };

  await supabase.from('translation_job_items').update(updateData).eq('job_id', jobId).eq('key_id', keyId);
}

// =============================================================================
// Deno HTTP Handler
// =============================================================================

Deno.serve(handleTranslateRequest);
