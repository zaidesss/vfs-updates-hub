import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QuestionRequest {
  updateId: string;
  updateTitle: string;
  userEmail: string;
  question: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { updateId, updateTitle, userEmail, question }: QuestionRequest = await req.json();

    console.log(`Received question for update: ${updateTitle} from ${userEmail}`);

    // Save the question to the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await supabase
      .from("update_questions")
      .insert({
        update_id: updateId,
        user_email: userEmail.toLowerCase(),
        question: question,
      });

    if (insertError) {
      console.error("Error saving question:", insertError);
    }

    // Send email to HR
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || '';
    
    const emailResponse = await resend.emails.send({
      from: "VFS Updates Hub <noreply@updates.virtualfreelancesolutions.com>",
      to: ["hr@virtualfreelancesolutions.com"],
      subject: `Question about Update: ${updateTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Question Submitted</h2>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Update:</strong> ${updateTitle}</p>
            <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${userEmail}</p>
            <p style="margin: 0;"><strong>Question:</strong></p>
            <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${question}</p>
          </div>
          
          <p style="color: #666; font-size: 12px;">
            This question was submitted through the VFS Updates Hub.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-question function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
