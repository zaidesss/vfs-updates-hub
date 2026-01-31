import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ScoringCategory {
  category: string;
  subcategories: {
    subcategory: string;
    behavior: string;
    maxPoints: number;
    isCritical: boolean;
  }[];
}

interface RequestBody {
  ticketContent: string;
  categories: ScoringCategory[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketContent, categories }: RequestBody = await req.json();

    if (!ticketContent || !categories) {
      return new Response(
        JSON.stringify({ error: 'Missing ticketContent or categories' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt
    const systemPrompt = `You are an expert Quality Assurance evaluator for customer service interactions. 
Analyze the provided ticket conversation and score the agent's performance.

Scoring Guidelines:
- Regular scores range from 2 (Needs Improvement) to 6 (Excellent)
- 2 = Major issues, needs significant improvement
- 3 = Below expectations, multiple issues
- 4 = Meets basic expectations
- 5 = Good performance, minor areas for improvement  
- 6 = Excellent, exceeds expectations

Critical Error Detection:
- For critical error categories, return true ONLY if the agent clearly violated the policy
- "Sharing Internal Info" = Agent shared internal processes, system issues, or company-only information
- "Incorrect Critical Info" = Agent provided factually wrong information about orders, refunds, or policies
- "Policy Breach" = Agent violated a major company policy

Be fair and objective. If unsure, err on the side of the agent.`;

    const userPrompt = `Analyze this customer service ticket conversation and provide scores for each category.

=== TICKET CONTENT ===
${ticketContent}

=== SCORING CATEGORIES ===
${categories.map(cat => 
  `${cat.category}:\n${cat.subcategories.map(sub => 
    `- ${sub.subcategory}: ${sub.behavior} (${sub.isCritical ? 'Critical Error: Yes/No' : `Score 2-${sub.maxPoints}`})`
  ).join('\n')}`
).join('\n\n')}

Return a JSON object with keys in format "Category|Subcategory" and values containing:
- For regular scores: { "score": number (2-6) }
- For critical errors: { "criticalError": boolean }

Example response format:
{
  "Communication and Professionalism|Tone and Empathy": { "score": 5 },
  "Communication and Professionalism|Critical Error: Sharing Internal Info": { "criticalError": false }
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parse the JSON from the response
    let suggestions: Record<string, { score?: number; criticalError?: boolean }> = {};
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return empty suggestions if parsing fails
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-qa-ticket:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
