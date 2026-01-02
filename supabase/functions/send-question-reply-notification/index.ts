import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReplyNotificationRequest {
  questionId: string;
  updateId: string;
  updateTitle: string;
  replyText: string;
  repliedBy: string;
  userEmail: string;
}

serve(async (req: Request): Promise<Response> => {
  console.log("send-question-reply-notification function called");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionId, updateId, updateTitle, replyText, repliedBy, userEmail }: ReplyNotificationRequest = await req.json();
    
    console.log(`Processing reply notification for question ${questionId}`);
    console.log(`Update: ${updateTitle}, Replied by: ${repliedBy}, User: ${userEmail}`);

    if (!userEmail) {
      console.log("No user email provided, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No email to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "VFS Agent Portal <onboarding@resend.dev>",
      to: [userEmail],
      subject: `Your question about "${updateTitle}" has been answered`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your Question Has Been Answered</h2>
          <p>Hi,</p>
          <p>Your question about the update <strong>"${updateTitle}"</strong> has received a reply from <strong>${repliedBy}</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #555;">Reply:</h4>
            <p style="margin: 0; color: #333;">${replyText}</p>
          </div>
          
          <p>Log in to the VFS Agent Portal to view the full details.</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message from the VFS Agent Portal.
          </p>
        </div>
      `,
    });

    console.log("Reply notification email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-question-reply-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
