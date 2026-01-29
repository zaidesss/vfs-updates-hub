import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpworkTimeResponse {
  hours: number;
  error?: string;
}

async function refreshAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get('UPWORK_CLIENT_ID');
  const clientSecret = Deno.env.get('UPWORK_CLIENT_SECRET');
  const refreshToken = Deno.env.get('UPWORK_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('Missing Upwork OAuth credentials for token refresh');
    return null;
  }

  try {
    const response = await fetch('https://www.upwork.com/api/v3/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Token refreshed successfully');
    
    // Note: In production, you'd want to store the new tokens
    // For now, we log them so they can be manually updated
    console.log('New access token obtained (update UPWORK_ACCESS_TOKEN secret)');
    if (data.refresh_token) {
      console.log('New refresh token obtained (update UPWORK_REFRESH_TOKEN secret)');
    }

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

async function fetchWorkDiary(
  contractId: string,
  date: string,
  accessToken: string
): Promise<{ hours: number; needsRefresh: boolean }> {
  // Upwork Work Diary API expects date in YYYYMMDD format
  const formattedDate = date.replace(/-/g, '');
  
  const url = `https://www.upwork.com/api/v3/workdiary/contracts/${contractId}/${formattedDate}`;
  
  console.log(`Fetching work diary: ${url}`);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    return { hours: 0, needsRefresh: true };
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Work diary fetch failed:', response.status, errorText);
    throw new Error(`Upwork API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Calculate total hours from work diary snapshots
  // Each snapshot represents 10 minutes of work
  let totalMinutes = 0;
  
  if (data.data && data.data.cells) {
    // Each cell in the work diary represents a 10-minute slot
    totalMinutes = data.data.cells.length * 10;
  } else if (data.snapshots) {
    // Alternative response format
    totalMinutes = data.snapshots.length * 10;
  }

  const hours = totalMinutes / 60;
  console.log(`Total hours for ${date}: ${hours}`);
  
  return { hours, needsRefresh: false };
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
        JSON.stringify({ error: 'contractId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!date) {
      return new Response(
        JSON.stringify({ error: 'date is required (YYYY-MM-DD format)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = Deno.env.get('UPWORK_ACCESS_TOKEN');
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'UPWORK_ACCESS_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First attempt with current access token
    let result = await fetchWorkDiary(contractId, date, accessToken);

    // If token expired, try to refresh and retry
    if (result.needsRefresh) {
      console.log('Access token expired, attempting refresh...');
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        result = await fetchWorkDiary(contractId, date, newToken);
        
        if (result.needsRefresh) {
          return new Response(
            JSON.stringify({ error: 'Authentication failed after token refresh' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Token refresh failed. Please re-authorize Upwork.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const response: UpworkTimeResponse = {
      hours: result.hours,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in fetch-upwork-time:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
