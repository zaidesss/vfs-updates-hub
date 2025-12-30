import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();
    
    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a professional technical writer creating internal knowledge base articles. Format the raw text into clean, structured markdown following these EXACT patterns:

## HEADING STRUCTURE
- Use ## for main sections (e.g., "## A. Prerequisites", "## B. Status Definitions")
- Use ### for subsections (e.g., "### Agent Action:", "### TL Action:")
- Keep section letters/numbers from the original if present

## INLINE CODE STYLING
Use backticks for these elements to make them stand out as badges:
- System names: \`Sticky\`, \`Authorize.net\`, \`Zendesk\`, \`PayPal\`
- IDs and numbers: \`MID 6833393\`, \`Transaction ID\`
- Domains: \`Dalesshop.co\`
- Status values: \`Expired\`, \`Settled\`, \`Refunded\`
- Field names: \`Invoice #\`, \`Status\`

## LISTS
- Use **bold** for labels at the start of list items: "**Agent:** Initiates refunds..."
- Use numbered lists (1. 2. 3.) for sequential steps/procedures
- Use bullet points (-) for non-sequential items
- Indent sub-items properly

## CALLOUTS (use blockquotes with keywords)
For warnings/important notes, use:
> **⚠️ VERY IMPORTANT:** [text here]

For general info/notes, use:
> **ℹ️ Note:** [text here]

For success/tips, use:
> **✅ Tip:** [text here]

## MESSAGING TEMPLATES
Wrap customer messaging samples in blockquotes WITHOUT warning keywords:
> Hi [Name],
> Your refund of [Amount] has been processed successfully...
> Best, [Agent]

## TIMELINE SECTION
Format timeline entries as:
**July 15, 2025:** Created a guide – "Step-by-Step Guide..." – Created by Malcom.

## TABLES
Convert any tabular data into markdown tables with headers.

## SEPARATORS
Use --- between major sections when transitioning topics.

## GENERAL RULES
- Preserve ALL original content - only add formatting
- Make the document scannable with clear visual hierarchy
- Add blank lines between sections for readability
- Keep messaging templates clearly separated from instructions
- Bold key action words and important terms

Return ONLY the formatted markdown, no explanations.`;

    console.log('Calling Lovable AI for formatting...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Format the following update text into professional markdown for our internal knowledge base:\n\n${content}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const formattedContent = data.choices?.[0]?.message?.content;

    if (!formattedContent) {
      console.error('No content in AI response:', data);
      return new Response(
        JSON.stringify({ error: 'AI did not return formatted content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully formatted content');
    
    return new Response(
      JSON.stringify({ formattedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in format-update function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
