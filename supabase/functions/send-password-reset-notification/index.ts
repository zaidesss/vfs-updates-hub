import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetNotificationRequest {
  email: string;
  userName?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { email, userName }: PasswordResetNotificationRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const displayName = userName || "User";

    console.log(`Sending password reset notification to ${normalizedEmail}`);

    const emailResponse = await resend.emails.send({
      from: "VFS Agent Portal <onboarding@resend.dev>",
      to: [normalizedEmail],
      subject: "Password Change Required",
      html: `
        <h2>Password Change Required</h2>
        <p>Hello ${displayName},</p>
        <p>An administrator has requested that you change your password for VFS Agent Portal.</p>
        <p><strong>What you need to do:</strong></p>
        <ol>
          <li>Log out of the VFS Agent Portal (if currently logged in)</li>
          <li>Log back in with your current credentials</li>
          <li>You will be prompted to set a new password</li>
        </ol>
        <p>If you have any questions, please contact your administrator.</p>
        <br>
        <p>Best regards,<br>VFS Agent Portal Team</p>
      `,
    });

    console.log("Password reset notification sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-password-reset-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});