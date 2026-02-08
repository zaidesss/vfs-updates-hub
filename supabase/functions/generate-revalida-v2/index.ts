import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(`Missing Supabase configuration: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      batchId,
      mcqCount,
      tfCount,
      situationalCount,
    } = await req.json();

    if (!batchId || !mcqCount || !tfCount || !situationalCount) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get batch details
    const { data: batch, error: batchError } = await supabase
      .from("revalida_v2_batches")
      .select("*")
      .eq("id", batchId)
      .single();

    if (batchError || !batch) {
      throw new Error("Batch not found");
    }

    // Calculate previous week date range
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const previousMonday = new Date(now);
    previousMonday.setDate(now.getDate() - daysToMonday - 7);
    previousMonday.setHours(0, 0, 0, 0);

    const previousSunday = new Date(previousMonday);
    previousSunday.setDate(previousMonday.getDate() + 6);
    previousSunday.setHours(23, 59, 59, 999);

    // Fetch KB articles from previous week (exclude Revalida schedule announcements)
    const { data: updates, error: updatesError } = await supabase
      .from("updates")
      .select("id, title, summary, body, category, posted_at")
      .eq("status", "published")
      .not("title", "ilike", "Revalida%")
      .gte("posted_at", previousMonday.toISOString())
      .lte("posted_at", previousSunday.toISOString())
      .order("posted_at", { ascending: false });

    if (updatesError) {
      console.error("Updates fetch error:", updatesError);
    }

    // Fetch QA evaluations from previous week
    const { data: qaEvaluations, error: qaError } = await supabase
      .from("qa_evaluations")
      .select(
        `
        id,
        agent_email,
        audit_date,
        accuracy_feedback,
        compliance_feedback,
        customer_exp_feedback,
        qa_evaluation_scores(subcategory, ai_justification),
        qa_action_needed(action_plan_id, custom_action)
      `
      )
      .gte("audit_date", previousMonday.toISOString().split("T")[0])
      .lte("audit_date", previousSunday.toISOString().split("T")[0]);

    if (qaError) {
      console.error("QA evaluations fetch error:", qaError);
    }

    // Fetch active contracts
    const { data: contracts, error: contractsError } = await supabase
      .from("revalida_v2_contracts")
      .select("parsed_content")
      .eq("is_active", true)
      .order("uploaded_at", { ascending: false });

    if (contractsError) {
      console.error("Contracts fetch error:", contractsError);
    }

    // Prepare content for AI prompt
    const kbContent = (updates || [])
      .map(
        (u: any) =>
          `Title: ${u.title}\nCategory: ${u.category}\nSummary: ${u.summary}\nBody: ${u.body}`
      )
      .join("\n\n---\n\n");

    const qaContent = (qaEvaluations || [])
      .map(
        (e: any) =>
          `Agent: ${e.agent_email}\nDate: ${e.audit_date}\nFeedback: ${
            [e.accuracy_feedback, e.compliance_feedback, e.customer_exp_feedback].filter(Boolean).join(' | ') || 'N/A'
          }\nAI Suggestions: ${
            e.qa_evaluation_scores?.[0]?.ai_justification || "N/A"
          }`
      )
      .join("\n\n---\n\n");

    const contractContent = (contracts || [])
      .map((c: any) => c.parsed_content)
      .join("\n\n---\n\n");

    // Call Lovable AI to generate questions
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: `You are generating a knowledge assessment quiz for customer service agents.

CONTEXT:
- This week's focus is on reinforcing key processes and handling scenarios.
- Generate questions that test understanding of recent updates and compliance with service standards.
- IMPORTANT: Do NOT generate questions about Revalida test schedules, deadlines, or announcements. Only use actual knowledge content.

KNOWLEDGE BASE ARTICLES (Recent Updates):
${kbContent || "No recent updates"}

QA COACHING AREAS (From previous week evaluations):
${qaContent || "No QA data available"}

CUSTOMER SERVICE STANDARDS:
${contractContent || "No contract standards"}

REQUIREMENTS:
Generate exactly:
- ${mcqCount} Multiple Choice questions (1 point each)
- ${tfCount} True/False questions (1 point each)
- ${situationalCount} Situational questions (5 points each max)

RESPONSE FORMAT (JSON):
{
  "questions": [
    {
      "type": "mcq",
      "prompt": "...",
      "choice_a": "...",
      "choice_b": "...",
      "choice_c": "...",
      "choice_d": "...",
      "correct_answer": "A",
      "source_type": "kb_article|qa_action|contract",
      "source_reference": "optional reference",
      "source_excerpt": "snippet used to generate"
    },
    {
      "type": "true_false",
      "prompt": "...",
      "correct_answer": "True|False",
      "source_type": "...",
      "source_reference": "...",
      "source_excerpt": "..."
    },
    {
      "type": "situational",
      "prompt": "...",
      "evaluation_rubric": "Excellent: ... Good: ... Acceptable: ... Below: ...",
      "source_type": "...",
      "source_reference": "...",
      "source_excerpt": "..."
    }
  ]
}

Return ONLY the JSON, no other text.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error response:", errorText);
      throw new Error(`AI generation failed: ${errorText.substring(0, 200)}`);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("AI response structure:", JSON.stringify(aiResult));
      throw new Error("No content in AI response");
    }

    // Parse AI response
    let questions;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      const parsed = JSON.parse(jsonStr);
      questions = parsed.questions;
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    // Insert questions into database
    const questionsToInsert = questions.map((q: any, index: number) => ({
      batch_id: batchId,
      type: q.type,
      prompt: q.prompt,
      choice_a: q.choice_a || null,
      choice_b: q.choice_b || null,
      choice_c: q.choice_c || null,
      choice_d: q.choice_d || null,
      correct_answer: q.correct_answer || null,
      points: q.type === "situational" ? 5 : 1,
      order_index: index,
      source_type: q.source_type,
      source_reference: q.source_reference || null,
      source_excerpt: q.source_excerpt || null,
      evaluation_rubric: q.evaluation_rubric || null,
    }));

    const { error: insertError } = await supabase
      .from("revalida_v2_questions")
      .insert(questionsToInsert);

    if (insertError) {
      throw new Error(`Failed to insert questions: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        questionsGenerated: questionsToInsert.length,
        sourceWeekStart: previousMonday.toISOString().split("T")[0],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in generate-revalida-v2:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

Deno.serve(handler);
