import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { title, summary, body } = await req.json();
    
    if (!title && !summary && !body) {
      return new Response(
        JSON.stringify({ error: 'At least one of title, summary, or body is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch existing published updates
    const { data: existingUpdates, error: fetchError } = await supabase
      .from('updates')
      .select('id, title, summary, body, category, status, posted_at')
      .in('status', ['published', 'draft'])
      .order('posted_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      console.error('Error fetching updates:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch existing updates' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingUpdates || existingUpdates.length === 0) {
      return new Response(
        JSON.stringify({ similarUpdates: [], message: 'No existing updates to compare' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt for AI comparison
    const newUpdateText = `Title: ${title || 'N/A'}\nSummary: ${summary || 'N/A'}\nBody: ${body || 'N/A'}`;
    
    const existingUpdatesText = existingUpdates.map((u, i) => 
      `[${i + 1}] ID: ${u.id}\nTitle: ${u.title}\nSummary: ${u.summary}\nCategory: ${u.category || 'None'}\nStatus: ${u.status}`
    ).join('\n\n');

    const prompt = `You are an assistant that helps identify similar or duplicate content updates.

NEW UPDATE BEING CREATED:
${newUpdateText}

EXISTING UPDATES:
${existingUpdatesText}

Analyze the new update and find any existing updates that cover similar topics or would be better updated instead of creating a new one. Consider:
1. Same or similar topic/subject matter
2. Overlapping categories
3. Updates that contradict each other (e.g., old policy vs new policy)
4. Updates that could be consolidated

Return a JSON array of similar updates with this format:
[
  {
    "id": "uuid of the similar update",
    "title": "title of the similar update",
    "similarity": "high" | "medium" | "low",
    "reason": "Brief explanation of why this is similar"
  }
]

Only include updates with meaningful similarity. Return an empty array [] if no similar updates found.
Return ONLY the JSON array, no other text.`;

    console.log('Calling Lovable AI for similarity analysis...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that analyzes content for similarity. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices?.[0]?.message?.content || '[]';
    
    console.log('AI response:', responseText);

    // Parse the AI response
    let similarUpdates = [];
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        similarUpdates = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      similarUpdates = [];
    }

    // Enrich with full update data
    const enrichedResults = similarUpdates.map((similar: any) => {
      const fullUpdate = existingUpdates.find(u => u.id === similar.id);
      return {
        ...similar,
        update: fullUpdate || null,
      };
    }).filter((r: any) => r.update !== null);

    return new Response(
      JSON.stringify({ similarUpdates: enrichedResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-similar-updates:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
