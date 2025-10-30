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

interface SignUpRequest {
  email: string;
  password: string;
}

// =============================================================================
// Validation Schemas
// =============================================================================

const signUpSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create standardized error response
 */
function createErrorResponse(code: number, message: string, details?: Record<string, unknown>): ApiErrorResponse {
  return {
    data: null,
    error: {
      code,
      details,
      message,
    },
  };
}

/**
 * Check if registration is enabled in app_config
 */
async function isRegistrationEnabled(supabaseAdmin: ReturnType<typeof createClient>): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', 'registration_enabled')
    .single();

  if (error) {
    console.error('[signup] Failed to check registration status:', error);
    // fail open: if we can't check config, allow registration
    return true;
  }

  return data?.value === 'true';
}

// =============================================================================
// Main Handler
// =============================================================================

Deno.serve(async (req) => {
  // only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify(createErrorResponse(405, 'Method not allowed')), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    // parse request body
    const body: SignUpRequest = await req.json();

    // validate input
    const validation = signUpSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify(
          createErrorResponse(400, 'Invalid request data', {
            errors: validation.error.errors,
          })
        ),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // check if registration is enabled
    const registrationEnabled = await isRegistrationEnabled(supabaseAdmin);

    if (!registrationEnabled) {
      return new Response(
        JSON.stringify(
          createErrorResponse(403, 'Registration is currently disabled. Please contact support for access.')
        ),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // proceed with signup using auth admin API
    const { data, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      email_confirm: false, // require email verification
      password: body.password,
    });

    if (signUpError) {
      console.error('[signup] Supabase Auth error:', signUpError);

      // map common Supabase auth errors
      if (signUpError.message.includes('already registered') || signUpError.message.includes('email already exists')) {
        return new Response(JSON.stringify(createErrorResponse(409, 'An account with this email already exists')), {
          headers: { 'Content-Type': 'application/json' },
          status: 409,
        });
      }

      if (signUpError.message.includes('password') && signUpError.message.includes('weak')) {
        return new Response(JSON.stringify(createErrorResponse(400, 'Password is too weak')), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // generic auth error
      return new Response(JSON.stringify(createErrorResponse(500, 'Failed to create account')), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // success response
    return new Response(
      JSON.stringify({
        data: {
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
          id: data.user.id,
        },
        error: null,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[signup] Unexpected error:', error);
    return new Response(
      JSON.stringify(createErrorResponse(500, 'Internal server error', { original: String(error) })),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
