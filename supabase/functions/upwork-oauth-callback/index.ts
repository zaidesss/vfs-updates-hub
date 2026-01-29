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
    
    if (!clientId || !clientSecret) {
      throw new Error('Upwork credentials not configured');
    }
    
    const redirectUri = 'https://rsjjvgyobtazxgeedmvi.supabase.co/functions/v1/upwork-oauth-callback';
    
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://www.upwork.com/api/v3/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }
    
    const tokens = await tokenResponse.json();
    
    // Display the tokens for the admin to save as secrets
    // In production, you'd want to store these securely automatically
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Upwork OAuth Success</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .token-box { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 10px 0; word-break: break-all; }
            .label { font-weight: bold; color: #333; margin-bottom: 5px; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 20px; }
            h1 { color: #22c55e; }
          </style>
        </head>
        <body>
          <h1>✅ Upwork Authorization Successful!</h1>
          <p>Copy these tokens and add them as secrets in your Lovable project:</p>
          
          <div class="token-box">
            <div class="label">UPWORK_ACCESS_TOKEN:</div>
            <code>${tokens.access_token}</code>
          </div>
          
          <div class="token-box">
            <div class="label">UPWORK_REFRESH_TOKEN:</div>
            <code>${tokens.refresh_token}</code>
          </div>
          
          <div class="token-box">
            <div class="label">Token expires in:</div>
            <code>${tokens.expires_in} seconds (${Math.round(tokens.expires_in / 3600)} hours)</code>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong> Save these tokens immediately! This page will not be shown again.
            The access token will expire, but the refresh token will be used to get new access tokens automatically.
          </div>
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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
