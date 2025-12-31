import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Name directory lookup
const NAME_DIRECTORY: Record<string, string> = {
  "hr@virtualfreelancesolutions.com": "HR Department",
  "admin@virtualfreelancesolutions.com": "Admin",
  // Add more as needed
};

const getNameByEmail = (email: string): string => {
  const lowerEmail = email.toLowerCase();
  return NAME_DIRECTORY[lowerEmail] || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

    const { data: insertedQuestion, error: insertError } = await supabase
      .from("update_questions")
      .insert({
        update_id: updateId,
        user_email: userEmail.toLowerCase(),
        question: question,
      })
      .select("reference_number")
      .single();

    if (insertError) {
      console.error("Error saving question:", insertError);
    }

    const referenceNumber = insertedQuestion?.reference_number || 'Q-0000';
    const posterName = getNameByEmail(userEmail);
    const appUrl = 'https://vfs-updates-hub.lovable.app';

    // Send email to HR
    const emailResponse = await resend.emails.send({
      from: "VFS Updates Hub <noreply@updates.virtualfreelancesolutions.com>",
      to: ["hr@virtualfreelancesolutions.com"],
      subject: `Question ${referenceNumber}: ${updateTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Question Submitted</h2>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; margin-bottom: 20px;">
            <p style="margin: 0; color: #166534;"><strong>Reference:</strong> ${referenceNumber}</p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Update:</strong> ${updateTitle}</p>
            <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${posterName} (${userEmail})</p>
            <p style="margin: 0;"><strong>Question:</strong></p>
            <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${question}</p>
          </div>
          
          <a href="${appUrl}/updates/${updateId}" 
             style="display: inline-block; background-color: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            View Update
          </a>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This question was submitted through the VFS Updates Hub.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, referenceNumber }), {
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
