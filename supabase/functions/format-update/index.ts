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

    const systemPrompt = `You are an expert content writer who transforms complex, technical content into clear, warm, easy-to-understand knowledge base articles. Your goal is to make content accessible to everyone at a Flesch-Kincaid Grade Level 7 (readable by 12-13 year olds).

## YOUR MISSION
1. FIRST: Analyze the raw content for key information and core meaning
2. THEN: Rewrite each piece of information using Grade-7 vocabulary and short sentences
3. APPLY the warm, conversational Family Playbook style
4. STRUCTURE into the JSON schema below
5. ADD helpful enhancements (callouts, checklists, power phrases when customer-facing)

## READABILITY REQUIREMENTS (CRITICAL)
- Target Flesch-Kincaid Grade Level 7
- Maximum 15-20 words per sentence
- One idea per sentence
- Use active voice only (not "The refund will be processed" but "We will process the refund")
- No jargon or technical terms without simple explanations
- Break complex ideas into simple steps

## TONE GUIDELINES
- Warm and conversational (like talking to a helpful friend)
- Use "you" and "we" language
- Start sentences with action verbs when possible
- Use contractions naturally (don't, you're, we'll, it's)
- Be encouraging and supportive
- Acknowledge the reader's needs

## VOCABULARY SIMPLIFICATION (Always apply these)
- "Utilize" → "Use"
- "Commence" → "Start"
- "Facilitate" → "Help"
- "Subsequently" → "Then"
- "Regarding" → "About"
- "Prior to" → "Before"
- "Terminate" → "End" or "Stop"
- "Initiate" → "Start" or "Begin"
- "Assistance" → "Help"
- "Inquire" → "Ask"
- "Obtain" → "Get"
- "Provide" → "Give"
- "Indicate" → "Show" or "Tell"
- "Demonstrate" → "Show"
- "Implement" → "Use" or "Set up"
- "Sufficient" → "Enough"
- "Approximately" → "About"
- "Currently" → "Now"
- "Additionally" → "Also"
- "However" → "But"
- "Therefore" → "So"
- Remove corporate buzzwords and filler phrases

## CONTENT ENHANCEMENT RULES
- Break long paragraphs into bullet points or numbered steps
- Add "Power Phrases" section for customer-facing communication guides
- Include "Words to Avoid vs Say Instead" for communication/scripting content
- Add practical checklists for processes
- Use callouts (warning, info, tip, success) for important notes
- Add role cards when multiple people/teams are involved

## WHAT TO REWRITE (Not just reorganize!)
- Simplify complex explanations without losing important information
- Make technical content accessible to non-experts
- Transform passive voice to active voice
- Shorten long sentences into multiple short ones
- Replace formal language with friendly alternatives
- Keep the CORE MEANING but make it CRYSTAL CLEAR

## OUTPUT FORMAT: Return ONLY valid JSON, no markdown, no explanations.

SCHEMA:
{
  "title": "Clear, descriptive title (max 8 words)",
  "subtitle": "One sentence explaining what this helps with",
  "tags": ["Grade-7 Friendly", "Tag2", "Tag3"],
  "sections": [
    {
      "id": "section-id",
      "letter": "A",
      "title": "Section Title",
      "content": [
        // Content blocks go here (see types below)
      ]
    }
  ],
  "timeline": [
    {
      "date": "Today's date",
      "author": "AI Assistant",
      "description": "Formatted for clarity"
    }
  ]
}

CONTENT BLOCK TYPES:

1. Info Grid (for key-value information, prerequisites, system info):
{
  "type": "info-grid",
  "items": [
    {
      "title": "Card Title",
      "icon": "document|globe|list|card|package|users",
      "items": [
        { "label": "Field Name", "value": "Field Value" }
      ]
    }
  ]
}

2. Role Cards (for responsibilities by role):
{
  "type": "role-cards",
  "roles": [
    {
      "title": "Agent",
      "description": "What this role does (in simple terms)",
      "color": "blue|teal|purple|orange|green|red"
    }
  ]
}

3. Steps (for numbered procedures - rewrite each step clearly):
{
  "type": "steps",
  "steps": [
    {
      "number": 1,
      "title": "Short action title",
      "description": "Clear explanation of what to do and why",
      "substeps": ["Simple substep 1", "Simple substep 2"]
    }
  ]
}

4. Callout (for warnings, tips, important notes):
{
  "type": "callout",
  "variant": "warning|info|success|tip",
  "title": "Optional title",
  "text": "The callout message in simple language"
}

5. Message Template (for customer messaging scripts):
{
  "type": "message-template",
  "label": "Template Name",
  "content": "Hi [Name],\\n\\nYour friendly message here...\\n\\nBest,\\n[Agent]"
}

6. Checklist (for quick reference items):
{
  "type": "checklist",
  "title": "Quick Checklist",
  "items": ["Simple item 1", "Simple item 2", "Simple item 3"]
}

7. Paragraph (for regular text - keep short!):
{
  "type": "paragraph",
  "text": "Short, clear paragraph. One or two sentences max."
}

8. Table (for tabular data):
{
  "type": "table",
  "headers": ["Column 1", "Column 2"],
  "rows": [
    ["Simple value 1", "Simple value 2"]
  ]
}

9. List (for bulleted items):
{
  "type": "list",
  "title": "Optional title",
  "items": [
    { "label": "Optional label", "value": "Clear, simple item text" }
  ]
}

SECTION LETTER ASSIGNMENT:
- Use A, B, C, D, E, F, etc. in order
- Common patterns:
  - A: Quick Overview or Key Info
  - B: Before You Start / Prerequisites  
  - C: Step-by-Step Process
  - D: Special Cases or Exceptions
  - E: Quick Checklist
  - F: Need More Help?

TAG GUIDELINES:
- ALWAYS include "Grade-7 Friendly" as the first tag
- Add 2-3 relevant topic tags
- Examples: "Refunds", "Customer Service", "Billing"

REMEMBER: Your job is to REWRITE for clarity, not just reorganize. Transform complex content into something anyone can understand.`;

    console.log('Calling Lovable AI for Grade-7 formatting and rewriting...');
    
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
          { role: 'user', content: `Rewrite and structure the following raw content into a clear, Grade-7 readable knowledge base article. Simplify the language, use short sentences, and make it warm and friendly:\n\n${content}` }
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
    let formattedContent = data.choices?.[0]?.message?.content;

    if (!formattedContent) {
      console.error('No content in AI response:', data);
      return new Response(
        JSON.stringify({ error: 'AI did not return formatted content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up the response - remove markdown code blocks if present
    formattedContent = formattedContent.trim();
    if (formattedContent.startsWith('```json')) {
      formattedContent = formattedContent.slice(7);
    } else if (formattedContent.startsWith('```')) {
      formattedContent = formattedContent.slice(3);
    }
    if (formattedContent.endsWith('```')) {
      formattedContent = formattedContent.slice(0, -3);
    }
    formattedContent = formattedContent.trim();

    // Validate JSON
    try {
      const parsed = JSON.parse(formattedContent);
      console.log('Successfully formatted and rewrote content to Grade-7 level');
      
      return new Response(
        JSON.stringify({ formattedContent, structuredData: parsed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw content:', formattedContent);
      return new Response(
        JSON.stringify({ error: 'AI returned invalid JSON format', rawContent: formattedContent }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in format-update function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
