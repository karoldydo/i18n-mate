/**
 * CORS middleware for Supabase Edge Functions
 *
 * Handles CORS preflight requests and adds appropriate headers to responses
 */

export interface CorsOptions {
  allowedOrigins?: string[];
}

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://i18n-mate.karoldydo.com', // Production domain
];

/**
 * Get CORS headers for a given origin
 */
export function getCorsHeaders(origin?: string, options?: CorsOptions): HeadersInit {
  const allowedOrigins = options?.allowedOrigins || DEFAULT_ALLOWED_ORIGINS;
  const requestOrigin = origin || '';

  // If origin is in allowed list, use it; otherwise use first allowed origin
  const allowedOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Max-Age': '86400', // 24 hours cache for preflight
  };
}

/**
 * Wrap handler with CORS support
 */
export function withCors(handler: (req: Request) => Promise<Response> | Response, options?: CorsOptions) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin') || undefined;
    const corsHeaders = getCorsHeaders(origin, options);

    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: corsHeaders,
        status: 200,
      });
    }

    try {
      // Call the actual handler
      const response = await handler(req);

      // Add CORS headers to the response
      const headers = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value as string);
      });

      return new Response(response.body, {
        headers,
        status: response.status,
        statusText: response.statusText,
      });
    } catch (error) {
      console.error('[withCors] Error in handler:', error);

      // Return error response with CORS headers
      return new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 500,
            message: 'Internal server error',
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
          status: 500,
        }
      );
    }
  };
}
