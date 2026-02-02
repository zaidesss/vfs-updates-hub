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

    // Build the prompt with ALL-OR-NOTHING scoring instructions
    const systemPrompt = `You are an expert Quality Assurance evaluator for customer service interactions. 
Analyze the provided ticket conversation and score the agent's performance.

IMPORTANT - ALL-OR-NOTHING SCORING:
- This is a binary scoring system. For each subcategory, the agent either PASSES (full points) or FAILS (0 points).
- There are NO partial scores. Each subcategory has a maximum point value - the agent gets either 0 or that max value.
- Award the FULL points if the agent met the standard for that behavior.
- Award 0 points if the agent failed to meet the standard.

Critical Error Detection:
- For critical error categories, return true ONLY if the agent clearly violated the policy.
- "Incorrect Critical Info" = Agent provided factually wrong critical information
- "Policy and Process Breach" = Agent violated a major company policy or process
- "Security Breach" = Agent committed a security violation
- "Rude / Disrespectful Behavior" = Agent was rude or disrespectful to the customer

Be fair and objective. If unsure about a failure, award the full points.`;

    const userPrompt = `Analyze this customer service ticket conversation and provide scores for each category.

=== TICKET CONTENT ===
${ticketContent}

=== SCORING CATEGORIES (ALL-OR-NOTHING) ===
${categories.map(cat => 
  `${cat.category}:\n${cat.subcategories.map(sub => 
    sub.isCritical 
      ? `- ${sub.subcategory}: ${sub.behavior} (Critical Error: Yes/No)`
      : `- ${sub.subcategory}: ${sub.behavior} (ALL-OR-NOTHING: 0 or ${sub.maxPoints} points)`
  ).join('\n')}`
).join('\n\n')}

Return a JSON object with keys in format "Category|Subcategory" and values containing:
- For regular scores: { "score": number } - MUST be either 0 or the exact max points shown above
- For critical errors: { "criticalError": boolean }

IMPORTANT: Scores must be EXACTLY 0 (fail) or the max points value (pass). No other values are valid.

Example response format:
{
  "Accuracy|Language & Grammar": { "score": 3 },
  "Accuracy|Clarity & Structure": { "score": 0 },
  "Accuracy|Incorrect Critical Info": { "criticalError": false },
  "Compliance|Policy and Process Breach": { "criticalError": false }
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
        const rawSuggestions = JSON.parse(jsonMatch[0]);
        
        // Validate and clamp scores to be exactly 0 or maxPoints
        // Build a map of subcategory -> maxPoints for validation
        const maxPointsMap: Record<string, number> = {};
        categories.forEach(cat => {
          cat.subcategories.forEach(sub => {
            const key = `${cat.category}|${sub.subcategory}`;
            maxPointsMap[key] = sub.maxPoints;
          });
        });
        
        // Validate each suggestion
        for (const [key, value] of Object.entries(rawSuggestions)) {
          if (typeof value === 'object' && value !== null) {
            const typedValue = value as { score?: number; criticalError?: boolean };
            if ('criticalError' in typedValue) {
              // Critical error - keep as-is
              suggestions[key] = typedValue;
            } else if ('score' in typedValue && typeof typedValue.score === 'number') {
              // Regular score - ensure it's 0 or maxPoints
              const maxPoints = maxPointsMap[key] || 0;
              // If AI returned something other than 0 or maxPoints, interpret as pass/fail
              const normalizedScore = typedValue.score > 0 ? maxPoints : 0;
              suggestions[key] = { score: normalizedScore };
            }
          }
        }
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
