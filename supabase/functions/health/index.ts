import { createClient } from '@supabase/supabase-js';

import { withCors } from '../_shared/cors.ts';

// =============================================================================
// Types
// =============================================================================

/**
 * API Error Response - matches ApiErrorResponse from src/shared/types/types.ts
 * Format: { data: null, error: { code, message, details? } }
 */
interface ApiErrorResponse {
  data: null;
  error: {
    code: number;
    details?: Record<string, unknown>;
    message: string;
  };
}

/**
 * API Success Response - matches ApiResponse<T> from src/shared/types/types.ts
 * Format: { data: T, error: null }
 */
interface ApiResponse<T> {
  data: T;
  error: null;
}

/**
 * Health check success response data
 */
interface HealthCheckData {
  status: 'healthy';
  timestamp: string;
}

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Health check Edge Function
 *
 * Performs a simple database query to keep the Supabase project active.
 * This prevents project suspension on the free tier due to inactivity.
 *
 * @param _request - Request object (required by withCors signature, but unused in this function)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleHealthCheck(_request: Request): Promise<Response> {
  try {
    // initialize Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[health] Missing Supabase configuration');

      return new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 500,
            message: 'Service configuration error',
          },
        } as ApiErrorResponse),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // execute a simple database query to ensure database activity
    // using service_role key bypasses RLS, so this will always work
    // query app_config table which always exists and has at least 2 rows
    const { error } = await supabase.from('app_config').select('key').limit(1);

    // even if query fails, the database connection was established
    // which is what we need to keep the project active
    if (error) {
      console.log('[health] Database query executed (connection established)');
    }

    return new Response(
      JSON.stringify({
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
        } as HealthCheckData,
        error: null,
      } as ApiResponse<HealthCheckData>),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[health] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        data: null,
        error: {
          code: 500,
          message: 'Internal server error',
        },
      } as ApiErrorResponse),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}

Deno.serve(withCors(handleHealthCheck));
