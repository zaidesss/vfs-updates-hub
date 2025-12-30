import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Allowed origins for CORS - restrict to specific domains
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://preview--rsjjvgyobtazxgeedmvi.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if origin is allowed, default to first allowed origin
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('.lovable.dev')
  ) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Rate limiting configuration
const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  'read': { max: 100, windowMs: 60000 },      // 100/min for reads
  'ack': { max: 50, windowMs: 60000 },        // 50/min for acknowledgements
  'create_update': { max: 10, windowMs: 60000 } // 10/min for creating updates
};

// In-memory rate limit store (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userEmail: string, actionType: string): { allowed: boolean; retryAfter?: number } {
  const limits = RATE_LIMITS[actionType] || RATE_LIMITS['read'];
  const key = `${userEmail}:${actionType}`;
  const now = Date.now();
  const userLimit = rateLimitStore.get(key);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + limits.windowMs });
    return { allowed: true };
  }
  
  if (userLimit.count >= limits.max) {
    const retryAfter = Math.ceil((userLimit.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  userLimit.count++;
  return { allowed: true };
}

// Input validation schemas
const MAX_TITLE_LENGTH = 200;
const MAX_SUMMARY_LENGTH = 500;
const MAX_BODY_LENGTH = 10000;
const MAX_URL_LENGTH = 2000;
const MAX_POSTED_BY_LENGTH = 100;

const ALLOWED_URL_DOMAINS = [
  'customerserviceadvocates.zendesk.com',
  'docs.google.com',
  'forms.gle',
];

function validateUrl(url: string | null | undefined): boolean {
  if (!url) return true; // Optional
  if (url.length > MAX_URL_LENGTH) return false;
  
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'https:') return false;
    return ALLOWED_URL_DOMAINS.some(domain => urlObj.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

function validateUpdate(update: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!update.title || typeof update.title !== 'string' || update.title.length > MAX_TITLE_LENGTH) {
    return { valid: false, error: `Title is required and must be less than ${MAX_TITLE_LENGTH} characters` };
  }
  if (!update.summary || typeof update.summary !== 'string' || update.summary.length > MAX_SUMMARY_LENGTH) {
    return { valid: false, error: `Summary is required and must be less than ${MAX_SUMMARY_LENGTH} characters` };
  }
  if (!update.body || typeof update.body !== 'string' || update.body.length > MAX_BODY_LENGTH) {
    return { valid: false, error: `Body is required and must be less than ${MAX_BODY_LENGTH} characters` };
  }
  if (!update.posted_by || typeof update.posted_by !== 'string' || update.posted_by.length > MAX_POSTED_BY_LENGTH) {
    return { valid: false, error: `Posted by is required and must be less than ${MAX_POSTED_BY_LENGTH} characters` };
  }
  if (update.help_center_url && !validateUrl(update.help_center_url as string)) {
    return { valid: false, error: 'Help center URL must be a valid HTTPS URL from allowed domains' };
  }
  if (update.status && !['draft', 'published'].includes(update.status as string)) {
    return { valid: false, error: 'Status must be either "draft" or "published"' };
  }
  return { valid: true };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Validate origin for non-preflight requests
  if (req.method !== 'OPTIONS') {
    const isAllowedOrigin = origin && (
      ALLOWED_ORIGINS.includes(origin) || 
      origin.endsWith('.lovable.app') || 
      origin.endsWith('.lovable.dev')
    );
    
    if (origin && !isAllowedOrigin) {
      console.error(`Blocked request from unauthorized origin: ${origin}`);
      return new Response(JSON.stringify({ error: 'Forbidden - invalid origin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiUrl = Deno.env.get('GOOGLE_APPS_SCRIPT_URL');
    const apiKey = Deno.env.get('GOOGLE_APPS_SCRIPT_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!apiUrl || !apiKey) {
      console.error('Missing required environment variables: GOOGLE_APPS_SCRIPT_URL or GOOGLE_APPS_SCRIPT_API_KEY');
      return new Response(JSON.stringify({ error: 'Service configuration error' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: 'Service configuration error' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body first to check for unauthenticated actions
    const body = await req.json();
    const { action, update_id, agent_email, update, email } = body;

    // Handle unauthenticated action: validate_agent (for login flow)
    if (action === 'validate_agent') {
      if (!email || typeof email !== 'string') {
        return new Response(JSON.stringify({ error: 'Email is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const normalizedEmail = email.toLowerCase().trim();
      console.log(`Validating agent email: ${normalizedEmail}`);

      // Fetch agents from Google Sheets
      const url = `${apiUrl}?action=agents&key=${apiKey}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'X-API-KEY': apiKey },
      });

      if (!response.ok) {
        console.error('Failed to fetch agents for validation');
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const agents = await response.json();
      const isValid = Array.isArray(agents) && agents.some(
        (agent: { email?: string; active?: boolean }) => 
          agent.email?.toLowerCase() === normalizedEmail && agent.active !== false
      );

      console.log(`Agent validation result for ${normalizedEmail}: ${isValid}`);

      return new Response(JSON.stringify({ valid: isValid }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // All other actions require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase client with user's token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Verify the user's JWT and get user info
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user || !user.email) {
      console.error('Auth error:', userError?.message || 'No user or email');
      return new Response(JSON.stringify({ error: 'Unauthorized - invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userEmail = user.email.toLowerCase();
    console.log(`Authenticated user: ${userEmail}`);

    // Body already parsed above, use those values
    console.log(`Processing action: ${action} for user: ${userEmail}`);

    // Determine action type for rate limiting
    let actionType = 'read';
    if (action === 'ack') {
      actionType = 'ack';
    } else if (action === 'create_update') {
      actionType = 'create_update';
    }

    // Apply rate limiting
    const rateCheck = checkRateLimit(userEmail, actionType);
    if (!rateCheck.allowed) {
      console.warn(`Rate limit exceeded for ${userEmail} on action ${actionType}`);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': String(rateCheck.retryAfter || 60)
        }
      });
    }

    if (req.method === 'GET' || action === 'agents' || action === 'updates' || action === 'acknowledgements') {
      // GET request - fetch data (any authenticated user can read)
      const url = `${apiUrl}?action=${action}&key=${apiKey}`;
      console.log(`Fetching from: ${action}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error: ${response.status} - ${errorText}`);
        return new Response(JSON.stringify({ error: 'Failed to fetch data. Please try again.' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const data = await response.json();
      console.log(`Received ${Array.isArray(data) ? data.length : 'object'} items for ${action}`);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'ack') {
      // POST request - acknowledge update
      // Ensure user can only acknowledge as themselves
      if (!agent_email || agent_email.toLowerCase() !== userEmail) {
        console.error(`User ${userEmail} attempted to acknowledge as ${agent_email}`);
        return new Response(JSON.stringify({ 
          error: 'Forbidden - can only acknowledge updates as yourself' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`Acknowledging update ${update_id} for ${userEmail}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
          action: 'ack',
          update_id,
          agent_email: userEmail, // Use verified email
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error: ${response.status} - ${errorText}`);
        return new Response(JSON.stringify({ error: 'Failed to acknowledge update. Please try again.' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const data = await response.json();
      console.log('Acknowledgement response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'create_update') {
      // POST request - create new update (admin only)
      // Check admin permission using the RPC function
      const { data: isAdminResult, error: adminError } = await supabaseClient
        .rpc('is_admin', { _email: userEmail });

      if (adminError || !isAdminResult) {
        console.error(`Admin check failed for ${userEmail}:`, adminError?.message || 'Not an admin');
        return new Response(JSON.stringify({ error: 'Forbidden - admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate update input
      const validation = validateUpdate(update || {});
      if (!validation.valid) {
        console.error('Update validation failed:', validation.error);
        return new Response(JSON.stringify({ error: validation.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`Admin ${userEmail} creating update: ${update?.title}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
          action: 'create_update',
          ...update,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error: ${response.status} - ${errorText}`);
        return new Response(JSON.stringify({ error: 'Failed to create update. Please try again.' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const data = await response.json();
      console.log('Create update response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in google-sheets-api function:', errorMessage);
    // Return generic error to client - do not expose internal details
    return new Response(JSON.stringify({ 
      error: 'An internal error occurred. Please try again later.'
    }), {
      status: 500,
      headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
    });
  }
});
