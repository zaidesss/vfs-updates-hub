import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Proactive Upwork Token Refresh Edge Function
 * 
 * This function is triggered by a pg_cron job every 6 hours to ensure
 * Upwork OAuth tokens stay fresh and don't expire due to inactivity.
 * 
 * Key behaviors:
 * - Checks if tokens are within 12 hours of expiry (proactive buffer)
 * - Uses mutex lock to prevent concurrent refresh attempts
 * - Logs all activity for debugging
 * - Gracefully handles missing tokens or refresh failures
 */

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  organization_id: string | null;
  organization_name: string | null;
  refresh_lock_until: string | null;
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
    .select('access_token, refresh_token, expires_at, organization_id, organization_name, refresh_lock_until')
    .eq('id', 'default')
    .single();
  
  if (error || !data) {
    console.error('[REFRESH-TOKENS] Failed to get tokens from database:', error?.message);
    return null;
  }
  
  return data;
}

// Check if token needs refresh (expired or within 12 hour buffer)
function shouldRefreshToken(expiresAt: string): boolean {
  const expiresTime = new Date(expiresAt).getTime();
  const bufferMs = 12 * 60 * 60 * 1000; // 12 hours proactive buffer
  return Date.now() >= (expiresTime - bufferMs);
}

// Acquire refresh lock to prevent concurrent refreshes
async function acquireRefreshLock(): Promise<boolean> {
  const supabase = getSupabaseClient();
  const lockUntil = new Date(Date.now() + 30000).toISOString(); // 30 second lock
  
  const { data, error } = await supabase
    .from('upwork_tokens')
    .update({ refresh_lock_until: lockUntil })
    .eq('id', 'default')
    .or(`refresh_lock_until.is.null,refresh_lock_until.lt.${new Date().toISOString()}`)
    .select()
    .single();
  
  if (error || !data) {
    console.log('[REFRESH-TOKENS] Could not acquire refresh lock - another refresh may be in progress');
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

// Refresh tokens with Upwork OAuth API
async function refreshTokens(currentTokens: TokenData): Promise<boolean> {
  const clientId = Deno.env.get('UPWORK_CLIENT_ID');
  const clientSecret = Deno.env.get('UPWORK_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    console.error('[REFRESH-TOKENS] Missing UPWORK_CLIENT_ID or UPWORK_CLIENT_SECRET');
    return false;
  }
  
  const lockAcquired = await acquireRefreshLock();
  if (!lockAcquired) {
    console.log('[REFRESH-TOKENS] Lock not acquired, skipping refresh (another process may be handling it)');
    return true; // Not a failure, just skipping
  }
  
  try {
    console.log('[REFRESH-TOKENS] Refreshing tokens...');
    
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
      console.error(`[REFRESH-TOKENS] Token refresh failed: ${response.status} - ${responseText.substring(0, 200)}`);
      return false;
    }
    
    const tokens = JSON.parse(responseText);
    console.log('[REFRESH-TOKENS] Token refresh successful!');
    
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();
    
    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase
      .from('upwork_tokens')
      .update({
        access_token: tokens.access_token.trim(),
        refresh_token: (tokens.refresh_token || currentTokens.refresh_token).trim(),
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
        refresh_lock_until: null,
      })
      .eq('id', 'default');
    
    if (updateError) {
      console.error('[REFRESH-TOKENS] Failed to update tokens in database:', updateError);
      return false;
    }
    
    console.log(`[REFRESH-TOKENS] Tokens updated successfully. New expiry: ${expiresAt}`);
    return true;
    
  } catch (error) {
    console.error('[REFRESH-TOKENS] Error during token refresh:', error);
    return false;
  } finally {
    await releaseRefreshLock();
  }
}

serve(async (req) => {
  const startTime = Date.now();
  console.log('[REFRESH-TOKENS] Cron job triggered at', new Date().toISOString());
  
  try {
    // Get current tokens
    const tokens = await getTokensFromDatabase();
    
    if (!tokens) {
      console.log('[REFRESH-TOKENS] No tokens found in database. Skipping refresh.');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No tokens configured',
          action: 'skipped'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[REFRESH-TOKENS] Current token expires at: ${tokens.expires_at}`);
    
    // Check if refresh is needed (12 hour buffer)
    if (!shouldRefreshToken(tokens.expires_at)) {
      const hoursUntilExpiry = (new Date(tokens.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
      console.log(`[REFRESH-TOKENS] Token still valid for ${hoursUntilExpiry.toFixed(1)} hours. No refresh needed.`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Token valid for ${hoursUntilExpiry.toFixed(1)} more hours`,
          action: 'skipped',
          expires_at: tokens.expires_at
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Refresh tokens
    console.log('[REFRESH-TOKENS] Token within 12-hour expiry window. Initiating refresh...');
    const refreshSuccess = await refreshTokens(tokens);
    
    const duration = Date.now() - startTime;
    
    if (refreshSuccess) {
      console.log(`[REFRESH-TOKENS] Refresh completed successfully in ${duration}ms`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Token refreshed successfully',
          action: 'refreshed',
          duration_ms: duration
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.error(`[REFRESH-TOKENS] Refresh failed after ${duration}ms`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Token refresh failed - manual re-authorization may be required',
          action: 'failed',
          duration_ms: duration
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } } // Still 200 to not break cron
      );
    }
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[REFRESH-TOKENS] Unexpected error:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        action: 'error'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } } // Still 200 to not break cron
    );
  }
});
