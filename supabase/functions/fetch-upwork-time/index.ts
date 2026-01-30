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

// GraphQL introspection query to discover Contract workDays field arguments
const INTROSPECT_CONTRACT_WORKDAYS_ARGS = `
  query IntrospectContractWorkDaysArgs {
    __type(name: "Contract") {
      fields {
        name
        args {
          name
          type {
            name
            kind
            ofType {
              name
              kind
              inputFields {
                name
                type {
                  name
                  kind
                }
              }
            }
          }
        }
      }
    }
  }
`;

// GraphQL introspection query for WorkDiary type (nested in WorkDay)
const INTROSPECT_WORK_DIARY_TYPE = `
  query IntrospectWorkDiaryType {
    __type(name: "WorkDiary") {
      name
      fields {
        name
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
  }
`;

// GraphQL introspection query for time-related input types
const INTROSPECT_TIME_RANGE = `
  query IntrospectTimeRange {
    __type(name: "DateRange") {
      name
      kind
      inputFields {
        name
        type {
          name
          kind
        }
      }
    }
  }
`;

// GraphQL query using workDays with date range
// Based on introspection: WorkDay has date and workDiary fields
// GraphQL query using workDays with DateTimeRange
// Based on introspection: timeRange requires DateTimeRange with rangeStart and rangeEnd
// WorkDay has date and workDiary.cells
const CONTRACT_WORK_DAYS_QUERY = `
  query GetContractWorkDays($id: ID!, $timeRange: DateTimeRange!) {
    contract(id: $id) {
      id
      title
      status
      workDays(timeRange: $timeRange) {
        date
        workDiary {
          cells {
            cellTime
          }
        }
      }
    }
  }
`;

// Simple contract query without restricted fields
const SIMPLE_CONTRACT_QUERY = `
  query GetContract($id: ID!) {
    contract(id: $id) {
      id
      title
      status
      weeklyHoursLimit
    }
  }
`;

interface WorkDiaryCell {
  cellTime?: string;
}

interface WorkDay {
  date?: string;
  workDiary?: {
    cells?: WorkDiaryCell[];
  };
}

interface ContractResponse {
  id: string;
  title: string;
  status: string;
  weeklyHoursLimit?: number;
  workDays?: WorkDay[];
}

// Execute a GraphQL query against Upwork API
async function executeGraphQLQuery(
  query: string,
  variables: Record<string, unknown>,
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

// Fetch work days using GraphQL API
async function fetchWorkDaysGraphQL(
  contractId: string,
  date: string,
  accessToken: string
): Promise<{ hours: number | null; needsRefresh: boolean; error?: string }> {
  console.log(`Fetching work days via GraphQL for contract: ${contractId}, date: ${date}`);

  try {
    // Step 1: First verify the contract exists with basic fields
    console.log('Verifying contract exists...');
    const contractResult = await executeGraphQLQuery(
      SIMPLE_CONTRACT_QUERY,
      { id: contractId },
      accessToken
    );
    
    console.log('Contract verification result:', JSON.stringify(contractResult, null, 2));
    
    if (contractResult.errors && contractResult.errors.length > 0) {
      const errorMessage = contractResult.errors.map(e => e.message).join(', ');
      console.error('Contract verification errors:', errorMessage);
      
      if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('token')) {
        return { hours: null, needsRefresh: true };
      }
      
      return { hours: null, needsRefresh: false, error: errorMessage };
    }
    
    const contract = contractResult.data?.contract;
    if (!contract) {
      return { hours: 0, needsRefresh: false, error: 'Contract not found' };
    }
    
    console.log(`Contract verified: ${contract.title}, Status: ${contract.status}`);

    // Step 2: Try to fetch workDays with the correct timeRange format
    // DateTimeRange uses rangeStart and rangeEnd
    const timeRange = {
      rangeStart: date,
      rangeEnd: date
    };
    
    console.log(`Fetching workDays with timeRange: ${JSON.stringify(timeRange)}`);
    
    const workDaysResult = await executeGraphQLQuery(
      CONTRACT_WORK_DAYS_QUERY,
      { id: contractId, timeRange: timeRange },
      accessToken
    );
    
    console.log('workDays query result:', JSON.stringify(workDaysResult, null, 2));
    
    if (workDaysResult.errors && workDaysResult.errors.length > 0) {
      const errorMessage = workDaysResult.errors.map(e => e.message).join(', ');
      console.error('workDays query errors:', errorMessage);
      
      // Check if it's a scope/permission error
      if (errorMessage.toLowerCase().includes('scope') || errorMessage.toLowerCase().includes('permission')) {
        return { 
          hours: null, 
          needsRefresh: false, 
          error: `Upwork API scope restriction: ${errorMessage}. The Work Diary data requires additional API scopes that are not available.`
        };
      }
      
      return { hours: null, needsRefresh: false, error: errorMessage };
    }
    
    // Calculate hours from workDays cells
    const workDays = workDaysResult.data?.contract?.workDays || [];
    let totalMinutes = 0;
    
    for (const day of workDays) {
      if (day.date === date && day.workDiary?.cells) {
        // Each cell represents 10 minutes of tracked time
        totalMinutes += day.workDiary.cells.length * 10;
      }
    }
    
    const hours = totalMinutes / 60;
    console.log(`Total hours for ${date}: ${hours.toFixed(2)} (from ${totalMinutes} minutes)`);
    
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

    let result = await fetchWorkDaysGraphQL(contractId, date, tokens.access_token);

    if (result.needsRefresh) {
      console.log('API returned token expired, attempting refresh...');
      const refreshedTokens = await refreshTokensWithLock();
      
      if (refreshedTokens) {
        result = await fetchWorkDaysGraphQL(contractId, date, refreshedTokens.access_token);
        
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
