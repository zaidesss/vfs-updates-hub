import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiUrl = Deno.env.get('GOOGLE_APPS_SCRIPT_URL');
    const apiKey = Deno.env.get('GOOGLE_APPS_SCRIPT_API_KEY');

    if (!apiUrl || !apiKey) {
      console.error('Missing required environment variables');
      throw new Error('API configuration missing');
    }

    const { action, update_id, agent_email, update } = await req.json();
    
    console.log(`Processing action: ${action}`);

    if (req.method === 'GET' || action === 'agents' || action === 'updates' || action === 'acknowledgements') {
      // GET request - fetch data
      const url = `${apiUrl}?action=${action}&key=${apiKey}`;
      console.log(`Fetching from: ${action}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error: ${response.status} - ${errorText}`);
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log(`Received ${Array.isArray(data) ? data.length : 'object'} items for ${action}`);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'ack') {
      // POST request - acknowledge update
      console.log(`Acknowledging update ${update_id} for ${agent_email}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
          action: 'ack',
          update_id,
          agent_email,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error: ${response.status} - ${errorText}`);
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('Acknowledgement response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'create_update') {
      // POST request - create new update
      console.log(`Creating update: ${update?.title}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
          action: 'create_update',
          ...update,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error: ${response.status} - ${errorText}`);
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('Create update response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in google-sheets-api function:', errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: 'Check the edge function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
