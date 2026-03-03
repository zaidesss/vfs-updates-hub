import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { items } = await req.json();
    // items: Array<{ question_id: string, question_text: string, correct_answer: string, agent_answer: string }>

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("items array is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = items.map((it: any, i: number) =>
      `Q${i + 1}: "${it.question_text}"\nCorrect answer: "${it.correct_answer}"\nAgent answer: "${it.agent_answer}"`
    ).join("\n\n");

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
            content: `You are grading a fill-in-the-blank quiz for customer support agents. For each question, determine if the agent's answer is CORRECT or INCORRECT.

Grading rules:
- The answer does NOT need to be verbatim/exact. Accept answers that capture the same meaning, gist, or thought.
- Accept synonyms (e.g., "post code" and "zip code" are equivalent).
- Ignore minor differences like articles ("the", "a"), capitalization, or slight rewording.
- Accept partial answers if they contain the essential concept (e.g., "last mile" for "last mile tracking number").
- Only mark INCORRECT if the agent's answer is factually wrong or misses the key concept entirely.
- An empty or blank answer is always INCORRECT.`,
          },
          {
            role: "user",
            content: `Grade these ${items.length} answers:\n\n${prompt}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_grades",
              description: "Submit grading results for all questions",
              parameters: {
                type: "object",
                properties: {
                  grades: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_index: { type: "number", description: "0-based index of the question" },
                        is_correct: { type: "boolean", description: "Whether the answer is correct" },
                      },
                      required: ["question_index", "is_correct"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["grades"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_grades" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error(`AI grading failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    
    // Build a map of question_id -> is_correct
    const results: Record<string, boolean> = {};
    for (const grade of parsed.grades) {
      const item = items[grade.question_index];
      if (item) {
        results[item.question_id] = grade.is_correct;
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("grade-nb-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
