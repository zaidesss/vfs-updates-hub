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
      console.error('Missing required environment variables');
      throw new Error('API configuration missing');
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      throw new Error('Supabase configuration missing');
    }

    // Extract and verify JWT token
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
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized - invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userEmail = user.email.toLowerCase();
    console.log(`Authenticated user: ${userEmail}`);

    const { action, update_id, agent_email, update } = await req.json();
    
    console.log(`Processing action: ${action} for user: ${userEmail}`);

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
        throw new Error(`API returned ${response.status}`);
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
        throw new Error(`API returned ${response.status}`);
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
        console.error(`Admin check failed for ${userEmail}:`, adminError);
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
        throw new Error(`API returned ${response.status}`);
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
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: 'Check the edge function logs for more information'
    }), {
      status: 500,
      headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
    });
  }
});
