import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    
    if (!code) {
      // Step 1: Redirect to Upwork authorization
      const clientId = Deno.env.get('UPWORK_CLIENT_ID');
      if (!clientId) {
        throw new Error('UPWORK_CLIENT_ID not configured');
      }
      
      const redirectUri = 'https://rsjjvgyobtazxgeedmvi.supabase.co/functions/v1/upwork-oauth-callback';
      const authUrl = `https://www.upwork.com/ab/account-security/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': authUrl,
        },
      });
    }
    
    // Step 2: Exchange code for tokens
    const clientId = Deno.env.get('UPWORK_CLIENT_ID');
    const clientSecret = Deno.env.get('UPWORK_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!clientId || !clientSecret) {
      throw new Error('Upwork credentials not configured');
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    const redirectUri = 'https://rsjjvgyobtazxgeedmvi.supabase.co/functions/v1/upwork-oauth-callback';
    
    // Exchange authorization code for tokens
    console.log('Exchanging authorization code for tokens...');
    const tokenResponse = await fetch('https://www.upwork.com/api/v3/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText.substring(0, 200)}`);
    }
    
    const tokens = await tokenResponse.json();
    console.log('Token exchange successful, expires_in:', tokens.expires_in);
    
    // Calculate expires_at timestamp
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();
    
    // Store tokens in database using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error: upsertError } = await supabase
      .from('upwork_tokens')
      .upsert({
        id: 'default',
        access_token: tokens.access_token.trim(),
        refresh_token: tokens.refresh_token.trim(),
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    
    if (upsertError) {
      console.error('Failed to store tokens:', upsertError);
      throw new Error(`Failed to store tokens: ${upsertError.message}`);
    }
    
    console.log('Tokens stored successfully in database, expires_at:', expiresAt);
    
    // Display success page (no raw tokens exposed)
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Upwork OAuth Success</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f9fafb; }
            .success-box { background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 12px; text-align: center; }
            h1 { color: #059669; margin-bottom: 10px; }
            p { color: #374151; line-height: 1.6; }
            .info { background: #fff; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #e5e7eb; }
            .label { font-weight: 600; color: #4b5563; }
            code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="success-box">
            <h1>✅ Upwork Authorization Complete!</h1>
            <p>Your Upwork account has been successfully connected.</p>
          </div>
          
          <div class="info">
            <p><span class="label">Status:</span> Tokens stored securely in database</p>
            <p><span class="label">Expires:</span> <code>${expiresAt}</code></p>
            <p><span class="label">Access Token:</span> <code>${tokens.access_token.substring(0, 10)}...${tokens.access_token.substring(tokens.access_token.length - 5)}</code> (${tokens.access_token.length} chars)</p>
            <p><span class="label">Refresh Token:</span> <code>${tokens.refresh_token.substring(0, 10)}...${tokens.refresh_token.substring(tokens.refresh_token.length - 5)}</code> (${tokens.refresh_token.length} chars)</p>
          </div>
          
          <p style="margin-top: 20px; color: #6b7280; text-align: center;">
            You can close this window and return to the dashboard.
          </p>
        </body>
      </html>
    `;
    
    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    });
    
  } catch (error: unknown) {
    console.error('OAuth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Upwork OAuth Error</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error-box { background: #fef2f2; border: 1px solid #ef4444; padding: 20px; border-radius: 12px; }
            h1 { color: #dc2626; }
            pre { background: #f3f4f6; padding: 15px; border-radius: 8px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="error-box">
            <h1>❌ OAuth Error</h1>
            <p>Something went wrong during authorization:</p>
            <pre>${errorMessage}</pre>
          </div>
        </body>
      </html>
    `;
    
    return new Response(errorHtml, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  }
});
