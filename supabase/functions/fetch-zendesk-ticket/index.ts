import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ZD_INSTANCES = {
  customerserviceadvocates: {
    subdomain: 'customerserviceadvocates',
    tokenEnv: 'ZENDESK_API_TOKEN_ZD1',
  },
  customerserviceadvocateshelp: {
    subdomain: 'customerserviceadvocateshelp',
    tokenEnv: 'ZENDESK_API_TOKEN_ZD2',
  },
};

interface RequestBody {
  zdInstance: string;
  ticketId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zdInstance, ticketId }: RequestBody = await req.json();

    if (!zdInstance || !ticketId) {
      return new Response(
        JSON.stringify({ error: 'Missing zdInstance or ticketId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const instanceConfig = ZD_INSTANCES[zdInstance as keyof typeof ZD_INSTANCES];
    if (!instanceConfig) {
      return new Response(
        JSON.stringify({ error: 'Invalid ZD instance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiToken = Deno.env.get(instanceConfig.tokenEnv);
    const adminEmail = Deno.env.get('ZENDESK_ADMIN_EMAIL');

    if (!apiToken || !adminEmail) {
      console.error('Missing Zendesk API credentials');
      return new Response(
        JSON.stringify({ error: 'Zendesk API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ticket details
    const ticketUrl = `https://${instanceConfig.subdomain}.zendesk.com/api/v2/tickets/${ticketId}.json`;
    const authHeader = 'Basic ' + btoa(`${adminEmail}/token:${apiToken}`);

    const ticketResponse = await fetch(ticketUrl, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!ticketResponse.ok) {
      const errorText = await ticketResponse.text();
      console.error('Zendesk ticket fetch error:', ticketResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Failed to fetch ticket: ${ticketResponse.status}` }),
        { status: ticketResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ticketData = await ticketResponse.json();

    // Fetch ticket comments (conversation)
    const commentsUrl = `https://${instanceConfig.subdomain}.zendesk.com/api/v2/tickets/${ticketId}/comments.json`;
    const commentsResponse = await fetch(commentsUrl, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    let comments: any[] = [];
    if (commentsResponse.ok) {
      const commentsData = await commentsResponse.json();
      comments = commentsData.comments || [];
    }

    // Format content for AI analysis
    const ticket = ticketData.ticket;
    let content = `=== TICKET #${ticketId} ===\n`;
    content += `Subject: ${ticket.subject || 'No subject'}\n`;
    content += `Status: ${ticket.status}\n`;
    content += `Priority: ${ticket.priority || 'Not set'}\n`;
    content += `Type: ${ticket.type || 'Not set'}\n`;
    content += `Created: ${ticket.created_at}\n`;
    content += `Updated: ${ticket.updated_at}\n\n`;
    
    content += `=== CONVERSATION ===\n\n`;
    
    for (const comment of comments) {
      const authorType = comment.public ? 'Public' : 'Internal';
      const timestamp = new Date(comment.created_at).toLocaleString();
      content += `[${timestamp}] ${authorType} Comment:\n`;
      content += `${comment.body}\n\n`;
      content += `---\n\n`;
    }

    return new Response(
      JSON.stringify({ 
        content,
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          created_at: ticket.created_at,
          comment_count: comments.length,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-zendesk-ticket:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
