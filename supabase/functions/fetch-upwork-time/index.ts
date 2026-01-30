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
  organization_id: string | null;
  organization_name: string | null;
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
    .select('access_token, refresh_token, expires_at, organization_id, organization_name')
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
      organization_id: currentTokens.organization_id,
      organization_name: currentTokens.organization_name,
    };
    
  } catch (error) {
    console.error('Error during token refresh:', error);
    return null;
  } finally {
    await releaseRefreshLock();
  }
}

// Introspection query to discover WorkDay type fields
// GraphQL query using workDays with workDiary.cells sub-field
// Each cell represents 10 minutes of tracked time
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
            memo
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

interface Cell {
  memo?: string;
}

interface WorkDiary {
  cells?: Cell[];
}

interface WorkDay {
  date?: string;
  workDiary?: WorkDiary;
}

interface ContractResponse {
  id: string;
  title: string;
  status: string;
  weeklyHoursLimit?: number;
  workDays?: WorkDay[];
}

interface IntrospectionField {
  name: string;
  type: {
    name: string | null;
    kind: string;
  };
}

interface IntrospectionType {
  name: string;
  fields: IntrospectionField[];
}

interface GraphQLResponse {
  data: {
    contract?: ContractResponse;
    __type?: IntrospectionType;
  } | null;
  errors?: Array<{ message: string }>;
}

// Execute a GraphQL query against Upwork API with organization context
async function executeGraphQLQuery(
  query: string,
  variables: Record<string, unknown>,
  accessToken: string,
  organizationId: string | null
): Promise<GraphQLResponse> {
  // Build headers with optional organization context
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken.trim()}`,
    'Content-Type': 'application/json',
  };
  
  // Add organization context header if available
  if (organizationId) {
    headers['X-Upwork-API-TenantId'] = organizationId;
    console.log(`Using organization context: ${organizationId}`);
  } else {
    console.log('No organization context - using personal account');
  }

  const response = await fetch(UPWORK_GRAPHQL_URL, {
    method: 'POST',
    headers,
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
  accessToken: string,
  organizationId: string | null
): Promise<{ hours: number | null; needsRefresh: boolean; error?: string }> {
  console.log(`Fetching work days via GraphQL for contract: ${contractId}, date: ${date}`);

  try {
    // Step 1: First verify the contract exists with basic fields
    console.log('Verifying contract exists...');
    const contractResult = await executeGraphQLQuery(
      SIMPLE_CONTRACT_QUERY,
      { id: contractId },
      accessToken,
      organizationId
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

    // Step 2: Fetch workDays with the correct timeRange format
    // Upwork expects compact date format: YYYYMMDD (no dashes)
    const compactDate = date.replace(/-/g, '');
    const timeRange = {
      rangeStart: compactDate,
      rangeEnd: compactDate
    };
    
    console.log(`Fetching workDays with timeRange: ${JSON.stringify(timeRange)}`);
    
    const workDaysResult = await executeGraphQLQuery(
      CONTRACT_WORK_DAYS_QUERY,
      { id: contractId, timeRange: timeRange },
      accessToken,
      organizationId
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
      
      return { 
        hours: null, 
        needsRefresh: false, 
        error: errorMessage
      };
    }
    
    // Process workDays and extract hours from workDiary
    const workDays = workDaysResult.data?.contract?.workDays || [];
    console.log(`Retrieved ${workDays.length} work days for ${date}`);
    
    if (workDays.length === 0) {
      console.log(`No work logged for ${date}`);
      return { 
        hours: 0, 
        needsRefresh: false
      };
    }
    
    // Log the actual structure of workDays to understand what's available
    console.log('First workDay structure:', JSON.stringify(workDays[0], null, 2));
    
    // Calculate total hours from workDiary.cells count (each cell = 10 minutes)
    let totalCells = 0;
    for (const day of workDays) {
      if (day.workDiary?.cells) {
        totalCells += day.workDiary.cells.length;
      }
    }
    
    // Convert cells to hours (each cell = 10 minutes = 1/6 hour)
    const totalHours = totalCells / 6;
    console.log(`Total hours for ${date}: ${totalHours.toFixed(2)} (from ${totalCells} cells x 10 min each)`);
    
    return { 
      hours: totalHours, 
      needsRefresh: false
    };
    
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
    
    console.log(`Tokens loaded - expires_at: ${tokens.expires_at}, organization_id: ${tokens.organization_id || 'none'}`);

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

    let result = await fetchWorkDaysGraphQL(contractId, date, tokens.access_token, tokens.organization_id);

    if (result.needsRefresh) {
      console.log('API returned token expired, attempting refresh...');
      const refreshedTokens = await refreshTokensWithLock();
      
      if (refreshedTokens) {
        result = await fetchWorkDaysGraphQL(contractId, date, refreshedTokens.access_token, refreshedTokens.organization_id);
        
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
