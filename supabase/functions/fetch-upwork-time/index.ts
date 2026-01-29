import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpworkTimeResponse {
  hours: number | null;
  error?: string;
  message?: string;
}

async function refreshAccessToken(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const clientId = Deno.env.get('UPWORK_CLIENT_ID');
  const clientSecret = Deno.env.get('UPWORK_CLIENT_SECRET');
  const refreshToken = Deno.env.get('UPWORK_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('Missing Upwork OAuth credentials for token refresh');
    return { accessToken: null, refreshToken: null };
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
      return { accessToken: null, refreshToken: null };
    }

    const data = await response.json();
    console.log('Token refreshed successfully');
    
    // Log that tokens need updating (manual process for now)
    console.log('⚠️ New tokens obtained - secrets need to be updated manually');

    return { 
      accessToken: data.access_token, 
      refreshToken: data.refresh_token || null 
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return { accessToken: null, refreshToken: null };
  }
}

/**
 * Fetch work diary using GraphQL API
 * The Upwork GraphQL API is at https://api.upwork.com/graphql
 */
async function fetchWorkDiaryGraphQL(
  contractId: string,
  date: string,
  accessToken: string
): Promise<{ hours: number | null; needsRefresh: boolean; error?: string }> {
  
  // GraphQL query to get contract work diary/timesheet data
  // Note: The exact query structure depends on Upwork's schema
  // This is a best-effort implementation based on available documentation
  const query = `
    query getContractTimesheet($contractId: ID!, $startDate: String!, $endDate: String!) {
      contract(id: $contractId) {
        id
        timesheet(startDate: $startDate, endDate: $endDate) {
          totalHours
          entries {
            date
            hours
          }
        }
      }
    }
  `;

  const variables = {
    contractId,
    startDate: date,
    endDate: date,
  };

  console.log(`Fetching work diary for contract ${contractId} on ${date} via GraphQL`);

  try {
    const response = await fetch('https://api.upwork.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 401) {
      await response.text(); // Consume body
      return { hours: null, needsRefresh: true };
    }

    const data = await response.json();
    
    // Check for GraphQL errors
    if (data.errors && data.errors.length > 0) {
      const errorMessage = data.errors[0].message;
      console.error('GraphQL error:', errorMessage);
      
      // Check if it's a permission/scope error
      if (errorMessage.includes('oauth2 permissions') || errorMessage.includes('scopes')) {
        return { 
          hours: null, 
          needsRefresh: false, 
          error: 'API scope insufficient. Contact admin to update Upwork API permissions.' 
        };
      }
      
      // Check if query/field doesn't exist
      if (errorMessage.includes('field') || errorMessage.includes('Unknown')) {
        return { 
          hours: null, 
          needsRefresh: false, 
          error: 'Work diary API not available. Check API documentation for updates.' 
        };
      }
      
      return { hours: null, needsRefresh: false, error: errorMessage };
    }

    // Parse hours from response
    const totalHours = data?.data?.contract?.timesheet?.totalHours;
    
    if (totalHours !== undefined && totalHours !== null) {
      console.log(`Total hours for ${date}: ${totalHours}`);
      return { hours: totalHours, needsRefresh: false };
    }

    // Fallback: try to sum entries if totalHours not available
    const entries = data?.data?.contract?.timesheet?.entries;
    if (entries && Array.isArray(entries)) {
      const hours = entries.reduce((sum: number, entry: { hours?: number }) => 
        sum + (entry.hours || 0), 0
      );
      console.log(`Calculated hours from entries for ${date}: ${hours}`);
      return { hours, needsRefresh: false };
    }

    return { hours: null, needsRefresh: false, error: 'No timesheet data available' };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('GraphQL request error:', errorMessage);
    return { hours: null, needsRefresh: false, error: errorMessage };
  }
}

/**
 * Legacy REST API fallback (may not work with new Upwork API)
 */
async function fetchWorkDiaryREST(
  contractId: string,
  date: string,
  accessToken: string
): Promise<{ hours: number | null; needsRefresh: boolean; error?: string }> {
  // Format date as YYYYMMDD for REST API
  const formattedDate = date.replace(/-/g, '');
  
  // Try the legacy REST endpoint
  const url = `https://www.upwork.com/api/v3/workdiary/contracts/${contractId}/${formattedDate}`;
  
  console.log(`Trying REST API: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      await response.text();
      return { hours: null, needsRefresh: true };
    }

    if (response.status === 404) {
      await response.text();
      return { 
        hours: null, 
        needsRefresh: false, 
        error: 'Work diary REST API deprecated. GraphQL API may require different permissions.' 
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('REST API error:', response.status, errorText);
      return { hours: null, needsRefresh: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    
    // Calculate hours from snapshots (each snapshot = 10 minutes)
    let totalMinutes = 0;
    
    if (data.data?.cells) {
      totalMinutes = data.data.cells.length * 10;
    } else if (data.snapshots) {
      totalMinutes = data.snapshots.length * 10;
    }

    const hours = totalMinutes / 60;
    console.log(`REST API total hours: ${hours}`);
    
    return { hours, needsRefresh: false };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('REST request error:', errorMessage);
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

    let accessToken = Deno.env.get('UPWORK_ACCESS_TOKEN');
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'UPWORK_ACCESS_TOKEN not configured', hours: null }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try GraphQL first, then REST as fallback
    let result = await fetchWorkDiaryGraphQL(contractId, date, accessToken);

    // If GraphQL fails with specific error, try REST
    if (result.error && result.error.includes('not available')) {
      console.log('GraphQL failed, trying REST API...');
      result = await fetchWorkDiaryREST(contractId, date, accessToken);
    }

    // If token expired, try to refresh and retry
    if (result.needsRefresh) {
      console.log('Access token expired, attempting refresh...');
      const { accessToken: newToken } = await refreshAccessToken();
      
      if (newToken) {
        // Retry with new token
        result = await fetchWorkDiaryGraphQL(contractId, date, newToken);
        
        if (result.error && result.error.includes('not available')) {
          result = await fetchWorkDiaryREST(contractId, date, newToken);
        }
        
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
