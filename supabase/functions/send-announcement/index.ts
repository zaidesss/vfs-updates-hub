import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendGmailEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnnouncementRequest {
  recipientGroup: 'all_users' | 'team_leads' | 'management' | 'custom';
  customEmails?: string[];
  subject: string;
  body: string; // Markdown format
}

/**
 * Convert markdown to HTML
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;
  
  // Bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text* -> <em>text</em>
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  
  // Links: [text](url) -> <a href="url">text</a>
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #2563eb; text-decoration: underline;">$1</a>');
  
  // Unordered lists: lines starting with - or *
  const lines = html.split('\n');
  let inUnorderedList = false;
  let inOrderedList = false;
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const unorderedMatch = line.match(/^[\-\*]\s+(.+)$/);
    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    
    if (unorderedMatch) {
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
      }
      if (!inUnorderedList) {
        processedLines.push('<ul style="margin: 10px 0; padding-left: 20px;">');
        inUnorderedList = true;
      }
      processedLines.push(`<li style="margin: 5px 0;">${unorderedMatch[1]}</li>`);
    } else if (orderedMatch) {
      if (inUnorderedList) {
        processedLines.push('</ul>');
        inUnorderedList = false;
      }
      if (!inOrderedList) {
        processedLines.push('<ol style="margin: 10px 0; padding-left: 20px;">');
        inOrderedList = true;
      }
      processedLines.push(`<li style="margin: 5px 0;">${orderedMatch[1]}</li>`);
    } else {
      if (inUnorderedList) {
        processedLines.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
      }
      // Convert line breaks to <br> for non-list items
      if (line.trim()) {
        processedLines.push(`<p style="margin: 10px 0;">${line}</p>`);
      }
    }
  }
  
  // Close any open lists
  if (inUnorderedList) processedLines.push('</ul>');
  if (inOrderedList) processedLines.push('</ol>');
  
  return processedLines.join('\n');
}

/**
 * Build the email HTML template
 */
function buildEmailTemplate(senderName: string, subject: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📢 Announcement</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">From: ${senderName}</p>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="margin-top: 0; color: #1f2937; font-size: 20px;">${subject}</h2>
    
    <div style="color: #374151;">
      ${bodyHtml}
    </div>
  </div>
  
  <div style="background: #f9fafb; padding: 20px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
      This is an official announcement from the Agent Portal.<br>
      © ${new Date().getFullYear()} Virtual Freelance Solutions
    </p>
  </div>
</body>
</html>
  `.trim();
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderEmail = user.email.toLowerCase();

    // Check if sender has Admin or HR role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, name")
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
        JSON.stringify({ error: "Only Admins and HR can send announcements" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { recipientGroup, customEmails, subject, body }: AnnouncementRequest = await req.json();

    // Validate inputs
    if (!subject || subject.length > 200) {
      return new Response(
        JSON.stringify({ error: "Subject is required and must be under 200 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body || body.length > 10000) {
      return new Response(
        JSON.stringify({ error: "Body is required and must be under 10,000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve recipient emails based on group
    let recipientEmails: string[] = [];

    switch (recipientGroup) {
      case "all_users": {
        const { data, error } = await supabase
          .from("user_roles")
          .select("email");
        
        if (error) throw error;
        recipientEmails = (data || []).map(r => r.email.toLowerCase());
        break;
      }

      case "team_leads": {
        const { data, error } = await supabase
          .from("agent_profiles")
          .select("email")
          .eq("position", "Team Lead");
        
        if (error) throw error;
        recipientEmails = (data || []).map(r => r.email.toLowerCase());
        break;
      }

      case "management": {
        const { data, error } = await supabase
          .from("user_roles")
          .select("email")
          .in("role", ["admin", "super_admin", "hr"]);
        
        if (error) throw error;
        recipientEmails = (data || []).map(r => r.email.toLowerCase());
        break;
      }

      case "custom": {
        if (!customEmails || customEmails.length === 0) {
          return new Response(
            JSON.stringify({ error: "Custom emails are required for custom recipient group" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (customEmails.length > 500) {
          return new Response(
            JSON.stringify({ error: "Maximum 500 recipients allowed per send" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validate email format and deduplicate
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        recipientEmails = [...new Set(
          customEmails
            .map(e => e.trim().toLowerCase())
            .filter(e => emailRegex.test(e))
        )];
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid recipient group" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Deduplicate
    recipientEmails = [...new Set(recipientEmails)];

    if (recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid recipients found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sender's full name from agent_profiles or user_roles
    let senderName = roleData.name || senderEmail;
    
    const { data: profileData } = await supabase
      .from("agent_profiles")
      .select("full_name, agent_name")
      .eq("email", senderEmail)
      .maybeSingle();

    if (profileData?.full_name) {
      senderName = profileData.full_name;
    } else if (profileData?.agent_name) {
      senderName = profileData.agent_name;
    }

    // Convert markdown body to HTML
    const bodyHtml = markdownToHtml(body);

    // Build email template
    const emailHtml = buildEmailTemplate(senderName, subject, bodyHtml);

    // Send email via Gmail API with BCC
    console.log(`Sending announcement to ${recipientEmails.length} recipients from ${senderName}`);

    const result = await sendGmailEmail({
      to: ["hr@virtualfreelancesolutions.com"], // Send to HR address
      bcc: recipientEmails, // All recipients in BCC
      subject: subject,
      html: emailHtml,
      fromName: "Agent Portal",
    });

    if (!result.success) {
      console.error("Failed to send announcement:", result.error);
      return new Response(
        JSON.stringify({ error: result.error || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Announcement sent successfully. Message ID: ${result.messageId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messageId,
        recipientCount: recipientEmails.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-announcement:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
