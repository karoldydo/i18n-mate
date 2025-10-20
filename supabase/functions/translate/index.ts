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

    // 3. Check for active jobs (prevent concurrent translation jobs)
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

    // 4. Create translation_jobs record
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

    // 5. Get keys to translate based on mode
    let keyIds: string[] = [];

    if (validatedData.mode === 'all') {
      const { data: allKeys, error: keysError } = await supabase
        .from('keys')
        .select('id')
        .eq('project_id', validatedData.project_id);

      if (keysError) {
        console.error('[translate] Keys fetch error:', keysError);
        // Rollback job creation
        await supabase.from('translation_jobs').delete().eq('id', jobId);
        return createResponse(500, errorResponse(500, 'Failed to fetch keys'));
      }

      keyIds = (allKeys || []).map((k) => k.id);
    } else {
      keyIds = validatedData.key_ids;
    }

    if (keyIds.length === 0) {
      // No keys to translate - mark job as completed immediately
      await supabase
        .from('translation_jobs')
        .update({
          completed_keys: 0,
          failed_keys: 0,
          finished_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          status: 'completed',
          total_keys: 0,
        })
        .eq('id', jobId);

      return createResponse(202, {
        job_id: jobId,
        message: 'Translation job created',
        status: 'pending',
      } as CreateTranslationJobResponse);
    }

    // 6. Create translation_job_items records
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

    // Start background job processing without waiting
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

    // 7. Return 202 Accepted immediately
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
          await updateJobItem(supabase, jobId, keyId, 'skipped', 'SOURCE_NOT_FOUND', 'Source translation not found');
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

        // Validate translation
        if (!translatedValue || translatedValue.length === 0 || translatedValue.length > 250) {
          throw new Error('Invalid translation: too short or too long');
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
        await updateJobItem(supabase, jobId, keyId, 'failed', 'TRANSLATION_ERROR', errorMessage.substring(0, 255));
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
        total_keys: keyIds.length,
      })
      .eq('id', jobId);

    // Log telemetry
    try {
      await supabase.from('telemetry_events').insert({
        event_name: 'translation_completed',
        project_id: projectId,
        properties: {
          completed_keys: completedCount,
          failed_keys: failedCount,
          mode: mode,
          target_locale: targetLocale,
        },
      });
    } catch (err) {
      console.warn('[processTranslationJob] Telemetry insert failed:', err);
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
    max_tokens: params?.max_tokens || 256,
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
    throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
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
  errorCode: null | string,
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
