import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

if (import.meta.main) {
  console.error("This script should be run via Supabase Edge Functions");
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { answerId, questionId, agentAnswer } = await req.json();

    if (!answerId || !questionId || !agentAnswer) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get question details
    const { data: question, error: questionError } = await supabase
      .from("revalida_v2_questions")
      .select("*")
      .eq("id", questionId)
      .single();

    if (questionError || !question) {
      throw new Error("Question not found");
    }

    if (question.type !== "situational") {
      throw new Error("Can only grade situational questions");
    }

    // Call Lovable AI to grade the response
    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: `You are grading a customer service agent's response to a situational scenario.

SCENARIO:
${question.prompt}

EVALUATION RUBRIC:
${question.evaluation_rubric || "Use your judgment based on customer service best practices"}

CONTEXT (source material):
${question.source_excerpt || "N/A"}

AGENT'S RESPONSE:
${agentAnswer}

Evaluate and provide:
1. Score (0-5 points)
2. Brief justification (1-2 sentences)

RESPONSE FORMAT (JSON):
{
  "suggested_score": 4,
  "justification": "Brief explanation of the score"
}

Return ONLY the JSON, no other text.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.json();
      throw new Error(`AI grading failed: ${JSON.stringify(error)}`);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices[0].message.content;

    // Parse AI response
    let gradeResult;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      gradeResult = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse grade response:", content);
      throw new Error("Invalid grading response format");
    }

    // Update answer with AI score
    const { error: updateError } = await supabase
      .from("revalida_v2_answers")
      .update({
        ai_suggested_score: Math.min(5, Math.max(0, gradeResult.suggested_score)),
        ai_score_justification: gradeResult.justification,
        ai_status: "graded",
      })
      .eq("id", answerId);

    if (updateError) {
      throw new Error(`Failed to update answer: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggested_score: gradeResult.suggested_score,
        justification: gradeResult.justification,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in grade-situational-v2:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

Deno.serve(handler);
