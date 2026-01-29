import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpworkTimeResponse {
  hours: number | null;
  error?: string;
  message?: string;
}

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

// Create Supabase client with service role
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Get tokens from database
async function getTokensFromDatabase(): Promise<TokenData | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('upwork_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('id', 'default')
    .single();
  
  if (error || !data) {
    console.error('Failed to get tokens from database:', error?.message);
    return null;
  }
  
  return data;
}

// Check if token needs refresh (expired or within 5 min buffer)
function shouldRefreshToken(expiresAt: string): boolean {
  const expiresTime = new Date(expiresAt).getTime();
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  return Date.now() >= (expiresTime - bufferMs);
}

// Acquire refresh lock to prevent concurrent refreshes
async function acquireRefreshLock(): Promise<boolean> {
  const supabase = getSupabaseClient();
  const lockUntil = new Date(Date.now() + 30000).toISOString(); // 30 second lock
  
  // Try to acquire lock only if no active lock exists
  const { data, error } = await supabase
    .from('upwork_tokens')
    .update({ refresh_lock_until: lockUntil })
    .eq('id', 'default')
    .or(`refresh_lock_until.is.null,refresh_lock_until.lt.${new Date().toISOString()}`)
    .select()
    .single();
  
  if (error || !data) {
    console.log('Could not acquire refresh lock - another refresh may be in progress');
    return false;
  }
  
  return true;
}

// Release refresh lock
async function releaseRefreshLock(): Promise<void> {
  const supabase = getSupabaseClient();
  
  await supabase
    .from('upwork_tokens')
    .update({ refresh_lock_until: null })
    .eq('id', 'default');
}

// Refresh tokens with mutex lock
async function refreshTokensWithLock(): Promise<TokenData | null> {
  const clientId = Deno.env.get('UPWORK_CLIENT_ID');
  const clientSecret = Deno.env.get('UPWORK_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    console.error('Missing UPWORK_CLIENT_ID or UPWORK_CLIENT_SECRET');
    return null;
  }
  
  // Try to acquire lock
  const lockAcquired = await acquireRefreshLock();
  if (!lockAcquired) {
    // Wait a bit and get fresh tokens (another process is refreshing)
    await new Promise(resolve => setTimeout(resolve, 2000));
    return await getTokensFromDatabase();
  }
  
  try {
    // Get current tokens
    const currentTokens = await getTokensFromDatabase();
    if (!currentTokens) {
      throw new Error('No tokens found in database');
    }
    
    console.log(`Refreshing tokens... Current refresh token: ${currentTokens.refresh_token.substring(0, 10)}... (${currentTokens.refresh_token.length} chars)`);
    
    // Make refresh request
    const response = await fetch('https://www.upwork.com/api/v3/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: currentTokens.refresh_token.trim(),
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`Token refresh failed: ${response.status} - ${responseText.substring(0, 200)}`);
      return null;
    }
    
    const tokens = JSON.parse(responseText);
    console.log(`Token refresh successful! New access token: ${tokens.access_token.substring(0, 10)}... expires_in: ${tokens.expires_in}`);
    
    // Calculate new expires_at
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();
    
    // CRITICAL: Store BOTH new access token AND new refresh token
    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase
      .from('upwork_tokens')
      .update({
        access_token: tokens.access_token.trim(),
        refresh_token: (tokens.refresh_token || currentTokens.refresh_token).trim(), // Use new refresh token if provided
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
        refresh_lock_until: null, // Release lock
      })
      .eq('id', 'default');
    
    if (updateError) {
      console.error('Failed to update tokens in database:', updateError);
      return null;
    }
    
    console.log('Tokens updated in database successfully');
    
    return {
      access_token: tokens.access_token.trim(),
      refresh_token: (tokens.refresh_token || currentTokens.refresh_token).trim(),
      expires_at: expiresAt,
    };
    
  } catch (error) {
    console.error('Error during token refresh:', error);
    return null;
  } finally {
    // Ensure lock is released even on error
    await releaseRefreshLock();
  }
}

// Fetch work diary using REST API
async function fetchWorkDiary(
  contractId: string,
  date: string,
  accessToken: string
): Promise<{ hours: number | null; needsRefresh: boolean; error?: string }> {
  // Format date as YYYYMMDD for REST API
  const formattedDate = date.replace(/-/g, '');
  const url = `https://www.upwork.com/api/v3/workdiary/contracts/${contractId}/${formattedDate}`;
  
  console.log(`Fetching work diary: ${url}`);
  console.log(`Using access token: ${accessToken.substring(0, 10)}... (${accessToken.length} chars)`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log(`Work diary response: ${response.status} - ${responseText.substring(0, 200)}`);

    if (response.status === 401) {
      // Check if it's explicitly an expired token error
      const lowerText = responseText.toLowerCase();
      if (lowerText.includes('expired') || lowerText.includes('invalid_token') || lowerText.includes('token')) {
        return { hours: null, needsRefresh: true };
      }
      
      // Other 401 errors - could be scope/permission issues
      return { 
        hours: null, 
        needsRefresh: false, 
        error: `Authentication failed (401): ${responseText.substring(0, 100)}` 
      };
    }

    if (response.status === 404) {
      // No work diary data for this date - return 0 hours
      return { hours: 0, needsRefresh: false };
    }

    if (!response.ok) {
      return { hours: null, needsRefresh: false, error: `API error: ${response.status} - ${responseText.substring(0, 100)}` };
    }

    const data = JSON.parse(responseText);
    
    // Calculate hours from snapshots (each snapshot = 10 minutes)
    let totalMinutes = 0;
    
    if (data.data?.cells) {
      totalMinutes = data.data.cells.length * 10;
    } else if (data.snapshots) {
      totalMinutes = data.snapshots.length * 10;
    }

    const hours = totalMinutes / 60;
    console.log(`Work diary total hours: ${hours}`);
    
    return { hours, needsRefresh: false };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Work diary request error:', errorMessage);
    return { hours: null, needsRefresh: false, error: errorMessage };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractId, date } = await req.json();

    if (!contractId) {
      return new Response(
        JSON.stringify({ error: 'contractId is required', hours: null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!date) {
      return new Response(
        JSON.stringify({ error: 'date is required (YYYY-MM-DD format)', hours: null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tokens from database
    let tokens = await getTokensFromDatabase();
    
    if (!tokens) {
      return new Response(
        JSON.stringify({ 
          error: 'No Upwork tokens configured. Please authorize via OAuth callback.', 
          hours: null 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Tokens loaded - expires_at: ${tokens.expires_at}, access_token: ${tokens.access_token.substring(0, 10)}...`);

    // Check if token needs refresh before making API call
    if (shouldRefreshToken(tokens.expires_at)) {
      console.log('Token expired or near expiry, refreshing...');
      const refreshedTokens = await refreshTokensWithLock();
      if (refreshedTokens) {
        tokens = refreshedTokens;
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'Token refresh failed. Please re-authorize Upwork.', 
            hours: null 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch work diary
    let result = await fetchWorkDiary(contractId, date, tokens.access_token);

    // If token explicitly expired during request, try refresh once
    if (result.needsRefresh) {
      console.log('API returned token expired, attempting refresh...');
      const refreshedTokens = await refreshTokensWithLock();
      
      if (refreshedTokens) {
        result = await fetchWorkDiary(contractId, date, refreshedTokens.access_token);
        
        if (result.needsRefresh) {
          return new Response(
            JSON.stringify({ error: 'Authentication failed after token refresh', hours: null }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Token refresh failed. Please re-authorize Upwork.', hours: null }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const response: UpworkTimeResponse = {
      hours: result.hours,
      error: result.error,
      message: result.error ? 'Unable to fetch Upwork data' : undefined,
    };

    // Return 200 even with errors so UI can handle gracefully
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in fetch-upwork-time:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(
      JSON.stringify({ error: errorMessage, hours: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
