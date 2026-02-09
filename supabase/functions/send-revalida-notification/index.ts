import { createClient } from "npm:@supabase/supabase-js@2";
import { sendGmailEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RevalidaNotificationRequest {
  batchTitle: string;
  testUrl: string;
  version: "v1" | "v2";
}

function buildRevalidaEmailTemplate(batchTitle: string, testUrl: string, version: "v1" | "v2"): string {
  const versionLabel = version === "v2" ? "Revalida 2.0" : "Revalida";
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📋 ${versionLabel} Assessment</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="margin-top: 0; color: #1f2937; font-size: 20px;">${batchTitle}</h2>
    
    <p style="color: #374151; margin: 16px 0;">A new ${versionLabel} assessment is now available. You have <strong>48 hours</strong> to complete it.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${testUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Take the Test</a>
    </div>
  </div>
  
  <div style="background: #f9fafb; padding: 20px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
      This is an official notification from the Agent Portal.<br>
      © ${currentYear} Virtual Freelance Solutions
    </p>
  </div>
</body>
</html>
  `.trim();
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderEmail = user.email.toLowerCase();

    // Check role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("email", senderEmail)
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "User not found in roles" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedRoles = ["admin", "super_admin", "hr"];
    if (!allowedRoles.includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { batchTitle, testUrl, version }: RevalidaNotificationRequest = await req.json();

    if (!batchTitle || !testUrl || !version) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: batchTitle, testUrl, version" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all user emails
    const { data: users, error: usersError } = await supabase
      .from("user_roles")
      .select("email");

    if (usersError) throw usersError;

    const recipientEmails = (users || []).map(u => u.email.toLowerCase());

    if (recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const versionLabel = version === "v2" ? "Revalida 2.0" : "Revalida";
    const subject = `${versionLabel}: ${batchTitle}`;
    const emailHtml = buildRevalidaEmailTemplate(batchTitle, testUrl, version);

    console.log(`Sending ${versionLabel} notification to ${recipientEmails.length} recipients`);

    const result = await sendGmailEmail({
      to: ["hr@virtualfreelancesolutions.com"],
      bcc: recipientEmails,
      subject,
      html: emailHtml,
      fromName: "Agent Portal",
    });

    if (!result.success) {
      console.error("Failed to send revalida notification:", result.error);
      return new Response(
        JSON.stringify({ error: result.error || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Revalida notification sent. Message ID: ${result.messageId}`);

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId, recipientCount: recipientEmails.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-revalida-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
