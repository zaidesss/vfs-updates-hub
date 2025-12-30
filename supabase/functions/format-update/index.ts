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

    const systemPrompt = `You are a professional technical writer creating structured knowledge base articles. Convert raw text into a JSON structure following this EXACT schema.

OUTPUT FORMAT: Return ONLY valid JSON, no markdown, no explanations.

SCHEMA:
{
  "title": "Main article title",
  "subtitle": "Brief description of what this article covers",
  "tags": ["Tag1", "Tag2", "Tag3"],
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
      "date": "January 1, 2025",
      "author": "Author Name",
      "description": "What changed"
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
      "description": "What this role does",
      "color": "blue|teal|purple|orange|green|red"
    }
  ]
}

3. Steps (for numbered procedures):
{
  "type": "steps",
  "steps": [
    {
      "number": 1,
      "title": "Step title",
      "description": "Optional detailed description",
      "substeps": ["Optional substep 1", "Optional substep 2"]
    }
  ]
}

4. Callout (for warnings, tips, important notes):
{
  "type": "callout",
  "variant": "warning|info|success|tip",
  "title": "Optional title",
  "text": "The callout message"
}

5. Message Template (for customer messaging scripts):
{
  "type": "message-template",
  "label": "Template Name",
  "content": "Hi [Name],\\n\\nYour message content here...\\n\\nBest,\\n[Agent]"
}

6. Checklist (for quick reference items):
{
  "type": "checklist",
  "title": "Optional title",
  "items": ["Item 1", "Item 2", "Item 3"]
}

7. Paragraph (for regular text):
{
  "type": "paragraph",
  "text": "Regular paragraph text here."
}

8. Table (for tabular data):
{
  "type": "table",
  "headers": ["Column 1", "Column 2"],
  "rows": [
    ["Value 1", "Value 2"],
    ["Value 3", "Value 4"]
  ]
}

9. List (for bulleted items):
{
  "type": "list",
  "title": "Optional title",
  "items": [
    { "label": "Optional label", "value": "Item text" }
  ]
}

SECTION LETTER ASSIGNMENT:
- Use A, B, C, D, E, F, etc. in order for each section
- Common section patterns:
  - A: Prerequisites, Overview, Key Information
  - B: Status Definitions, Terms, Concepts
  - C: Main Process/Workflow Steps
  - D: Secondary Process/Special Cases
  - E: Checklist, Quick Reference
  - F: Additional Information, FAQs

TAG GUIDELINES:
- Extract 2-4 relevant tags from the content
- Use system names, categories, or key concepts as tags
- Examples: "Authorize.net", "Refunds", "Bank Transactions", "PayPal"

CONTENT CONVERSION RULES:
- Group related information into info-grid blocks
- Convert role descriptions into role-cards
- Convert numbered lists into steps
- Convert warning/important notes into callouts
- Convert messaging scripts into message-templates
- Convert bullet lists into checklist or list blocks
- Use paragraphs sparingly, prefer structured content

PRESERVE ALL ORIGINAL CONTENT - only restructure and organize it.`;

    console.log('Calling Lovable AI for structured formatting...');
    
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
          { role: 'user', content: `Convert the following raw update text into the structured JSON format for our knowledge base. Extract all information and organize it properly:\n\n${content}` }
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
      console.log('Successfully formatted content to structured JSON');
      
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
