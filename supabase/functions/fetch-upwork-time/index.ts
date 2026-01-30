import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UPWORK_GRAPHQL_URL = 'https://api.upwork.com/graphql';

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
  
  const lockAcquired = await acquireRefreshLock();
  if (!lockAcquired) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return await getTokensFromDatabase();
  }
  
  try {
    const currentTokens = await getTokensFromDatabase();
    if (!currentTokens) {
      throw new Error('No tokens found in database');
    }
    
    console.log(`Refreshing tokens...`);
    
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
    console.log(`Token refresh successful!`);
    
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
      console.error('Failed to update tokens in database:', updateError);
      return null;
    }
    
    return {
      access_token: tokens.access_token.trim(),
      refresh_token: (tokens.refresh_token || currentTokens.refresh_token).trim(),
      expires_at: expiresAt,
    };
    
  } catch (error) {
    console.error('Error during token refresh:', error);
    return null;
  } finally {
    await releaseRefreshLock();
  }
}

// GraphQL query to fetch work diary time cells for a contract on a specific date
// workDiaryTimeCells requires a 'date' argument (String!)
// Each cell represents 10 minutes of tracked time
const CONTRACT_TIME_CELLS_QUERY = `
  query GetContractTimeCells($id: ID!, $date: String!) {
    contract(id: $id) {
      id
      title
      status
      workDiaryTimeCells(date: $date) {
        cellDateTime {
          rawValue
        }
      }
    }
  }
`;

// Introspection query for DateTime type
const DATETIME_INTROSPECTION_QUERY = `
  query IntrospectDateTime {
    __type(name: "DateTime") {
      name
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
`;

interface WorkDiaryTimeCell {
  cellDateTime: {
    rawValue?: string;
  };
}

interface ContractResponse {
  id: string;
  title: string;
  status: string;
  workDiaryTimeCells: WorkDiaryTimeCell[];
}

// Execute a GraphQL query against Upwork API
async function executeGraphQLQuery(
  query: string,
  variables: Record<string, string>,
  accessToken: string
): Promise<{ data: { contract?: ContractResponse; __type?: unknown } | null; errors?: Array<{ message: string }> }> {
  const response = await fetch(UPWORK_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const responseText = await response.text();
  console.log(`GraphQL response: ${response.status} - ${responseText.substring(0, 2000)}`);

  if (!response.ok && response.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }

  return JSON.parse(responseText);
}

// Fetch work diary using GraphQL API
async function fetchWorkDiaryGraphQL(
  contractId: string,
  date: string,
  accessToken: string
): Promise<{ hours: number | null; needsRefresh: boolean; error?: string }> {
  console.log(`Fetching work diary via GraphQL for contract: ${contractId}, date: ${date}`);

  try {
    // First, introspect DateTime to understand its fields
    console.log('Introspecting DateTime type...');
    const introspectionResult = await executeGraphQLQuery(
      DATETIME_INTROSPECTION_QUERY,
      {},
      accessToken
    );
    console.log('DateTime introspection:', JSON.stringify(introspectionResult, null, 2));
    
    // Now query with the date parameter
    const result = await executeGraphQLQuery(
      CONTRACT_TIME_CELLS_QUERY,
      { id: contractId, date: date },
      accessToken
    );
    
    if (result.errors && result.errors.length > 0) {
      const errorMessage = result.errors.map(e => e.message).join(', ');
      console.error('GraphQL errors:', errorMessage);
      
      if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('token')) {
        return { hours: null, needsRefresh: true };
      }
      
      return { hours: null, needsRefresh: false, error: errorMessage };
    }

    const contract = result.data?.contract;
    
    if (!contract) {
      console.log('No contract data found');
      return { hours: 0, needsRefresh: false };
    }

    console.log(`Contract: ${contract.title}, Status: ${contract.status}`);
    
    const timeCells = contract.workDiaryTimeCells || [];
    console.log(`Time cells for ${date}: ${timeCells.length}`);
    
    // Calculate hours: each cell = 10 minutes
    const totalMinutes = timeCells.length * 10;
    const hours = totalMinutes / 60;
    
    console.log(`Total hours for ${date}: ${hours.toFixed(2)}`);
    
    return { hours, needsRefresh: false };
    
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'TOKEN_EXPIRED') {
      return { hours: null, needsRefresh: true };
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('GraphQL request error:', errorMessage);
    return { hours: null, needsRefresh: false, error: errorMessage };
  }
}

serve(async (req) => {
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
    
    console.log(`Tokens loaded - expires_at: ${tokens.expires_at}`);

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

    let result = await fetchWorkDiaryGraphQL(contractId, date, tokens.access_token);

    if (result.needsRefresh) {
      console.log('API returned token expired, attempting refresh...');
      const refreshedTokens = await refreshTokensWithLock();
      
      if (refreshedTokens) {
        result = await fetchWorkDiaryGraphQL(contractId, date, refreshedTokens.access_token);
        
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
