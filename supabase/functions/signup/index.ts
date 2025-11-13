import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { withCors } from '../_shared/cors.ts';

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

async function handleSignup(req: Request): Promise<Response> {
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

    // generate verification link and send email via Resend
    const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || '';
    const redirectTo = siteUrl ? `${siteUrl}/email-verified` : undefined;

    // generate verification link using admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      email: body.email,
      options: redirectTo
        ? {
            redirectTo,
          }
        : undefined,
      type: 'signup',
    });

    if (linkError) {
      console.error('[signup] Failed to generate verification link:', linkError);
      // user was created successfully, but link generation failed
      // return success but log the error for debugging
      // the user can still use "resend verification" feature later
    } else if (linkData?.properties?.action_link) {
      // send email via Resend API
      const emailResult = await sendVerificationEmail(body.email, linkData.properties.action_link);

      if (!emailResult.success) {
        console.error('[signup] Failed to send verification email via Resend:', emailResult.error);
        // user was created successfully, but email sending failed
        // return success but log the error for debugging
        // the user can still use "resend verification" feature later
      } else {
        console.log('[signup] Verification email sent successfully to:', body.email);
      }
    } else {
      console.error('[signup] Verification link generated but action_link is missing');
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

/**
 * Send verification email via Resend API
 *
 * @param email - recipient email address
 * @param verificationLink - verification link generated by Supabase
 *
 * @returns success status and optional error message
 */
async function sendVerificationEmail(
  email: string,
  verificationLink: string
): Promise<{ error?: string; success: boolean }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'i18n-mate <noreply@karoldydo.com>';

  if (!resendApiKey) {
    return { error: 'RESEND_API_KEY not configured', success: false };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      body: JSON.stringify({
        from: fromEmail,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; text-align: center;">
                <h1 style="color: #007bff; margin-bottom: 20px;">Welcome to i18n-mate!</h1>
                <p style="font-size: 16px; margin-bottom: 30px;">Thank you for signing up. Please confirm your email address to get started.</p>
                <a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; margin-bottom: 30px;">Verify Email Address</a>
                <p style="font-size: 14px; color: #666; margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 12px; color: #999; word-break: break-all; margin-top: 10px;">${verificationLink}</p>
                <p style="font-size: 12px; color: #999; margin-top: 30px;">This link will expire in 1 hour.</p>
              </div>
              <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">If you didn't create an account, you can safely ignore this email.</p>
            </body>
          </html>
        `,
        subject: 'Confirm your email address - i18n-mate',
        text: `Welcome to i18n-mate!

Thank you for signing up. Please confirm your email address by clicking the link below:

${verificationLink}

This link will expire in 1 hour.

If you didn't create an account, you can safely ignore this email.`,
        to: [email],
      }),
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('[signup] Resend API error:', errorData);
      return { error: errorData.message || `HTTP ${response.status}`, success: false };
    }

    const result = await response.json();
    console.log('[signup] Email sent via Resend:', result.id);
    return { success: true };
  } catch (error) {
    console.error('[signup] Failed to send email via Resend:', error);
    return { error: String(error), success: false };
  }
}

// =============================================================================
// Main Handler
// =============================================================================

// Wrap handler with CORS middleware
Deno.serve(withCors(handleSignup));
