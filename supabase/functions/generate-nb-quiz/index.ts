import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { quizDate } = await req.json();
    if (!quizDate) throw new Error("quizDate is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if questions already exist for this date
    const { data: existing } = await supabase
      .from("nb_quiz_questions")
      .select("id")
      .eq("quiz_date", quizDate)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "Questions already exist for this date" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch published KB articles
    const { data: articles, error: articlesError } = await supabase
      .from("updates")
      .select("title, content")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(50);

    if (articlesError) throw articlesError;
    if (!articles || articles.length === 0) throw new Error("No KB articles found");

    const articlesText = articles
      .map((a: any) => `### ${a.title}\n${a.content}`)
      .join("\n\n---\n\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a quiz generator for customer support agents. Generate exactly 10 fill-in-the-blank questions based on the provided Knowledge Base articles. Each question should test factual knowledge from the articles.

Rules:
- Each question must have exactly ONE blank represented by "______"
- The correct answer should be a single word or short phrase (1-3 words max)
- Questions should be clear and unambiguous
- Cover different articles when possible
- Include the source article title for each question`,
          },
          {
            role: "user",
            content: `Generate 10 fill-in-the-blank questions from these Knowledge Base articles:\n\n${articlesText}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_quiz_questions",
              description: "Return 10 fill-in-the-blank quiz questions",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string", description: "The question with ______ as the blank" },
                        correct_answer: { type: "string", description: "The correct answer for the blank" },
                        source_article_title: { type: "string", description: "Title of the source KB article" },
                      },
                      required: ["question_text", "correct_answer", "source_article_title"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_quiz_questions" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    const questions = parsed.questions.slice(0, 10);

    // Insert questions
    const rows = questions.map((q: any, i: number) => ({
      quiz_date: quizDate,
      question_number: i + 1,
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      source_article_title: q.source_article_title,
    }));

    const { error: insertError } = await supabase.from("nb_quiz_questions").insert(rows);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-nb-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
