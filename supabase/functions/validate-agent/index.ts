import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Public endpoint: validates whether an email exists in the agents list.
// Returns ONLY { valid: boolean } to avoid leaking agent data.

const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://preview--rsjjvgyobtazxgeedmvi.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
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

// Simple in-memory rate limiter (resets on cold start)
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count++;
  return { allowed: true };
}

function extractEmail(agent: Record<string, unknown>): string {
  // Try common keys first
  const direct = agent.email ?? agent.Email ?? agent.eMail ?? agent['E-mail'] ?? agent['Email address'] ?? agent['email address'];
  if (typeof direct === 'string') return direct;

  // Fallback: first key that contains "email" (case-insensitive)
  for (const [k, v] of Object.entries(agent)) {
    if (k.toLowerCase().includes('email') && typeof v === 'string') return v;
  }

  return '';
}

function isActive(agent: Record<string, unknown>): boolean {
  const raw = agent.active ?? agent.Active ?? agent.ACTIVE;
  if (raw === undefined || raw === null) return true;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  if (typeof raw === 'string') {
    const v = raw.trim().toLowerCase();
    return !(v === 'false' || v === '0' || v === 'no' || v === 'inactive');
  }
  return true;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate origin for non-preflight requests
  const isAllowedOrigin = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovable.dev')
  );

  if (origin && !isAllowedOrigin) {
    console.error(`Blocked request from unauthorized origin: ${origin}`);
    return new Response(JSON.stringify({ error: 'Forbidden - invalid origin' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiUrl = Deno.env.get('GOOGLE_APPS_SCRIPT_URL');
    const apiKey = Deno.env.get('GOOGLE_APPS_SCRIPT_API_KEY');

    if (!apiUrl || !apiKey) {
      console.error('Missing required environment variables for validate-agent');
      return new Response(JSON.stringify({ error: 'Service configuration error' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const email = (body as { email?: unknown })?.email;
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const rateKey = `${normalizedEmail}:validate-agent`;
    const rate = checkRateLimit(rateKey);
    if (!rate.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(rate.retryAfter || 60),
        },
      });
    }

    // Fetch agents from Google Sheets
    const url = `${apiUrl}?action=agents&key=${apiKey}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch agents: ${response.status} - ${errorText}`);
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const agents = await response.json();

    const valid = Array.isArray(agents) && agents.some((a: unknown) => {
      if (!a || typeof a !== 'object') return false;
      const agent = a as Record<string, unknown>;
      const agentEmail = extractEmail(agent).toLowerCase().trim();
      return agentEmail === normalizedEmail && isActive(agent);
    });

    return new Response(JSON.stringify({ valid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in validate-agent function:', errorMessage);

    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again later.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
