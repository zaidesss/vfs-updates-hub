import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MismatchResult {
  usersWithoutProfile: { email: string; role: string; name?: string }[];
  profilesWithoutUser: { email: string; full_name?: string; employment_status?: string }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting daily user/profile mismatch check...");

    // Get all users from user_roles
    const { data: users, error: usersError } = await supabase
      .from("user_roles")
      .select("email, role, name");

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    // Get all agent profiles (including terminated for comparison)
    const { data: profiles, error: profilesError } = await supabase
      .from("agent_profiles")
      .select("email, full_name, employment_status");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Create sets for efficient lookup
    const userEmails = new Set((users as { email: string; role: string; name?: string }[] || []).map(u => u.email.toLowerCase()));
    const profileEmails = new Set((profiles as { email: string; full_name?: string; employment_status?: string }[] || []).map(p => p.email.toLowerCase()));

    // Find mismatches
    const mismatches: MismatchResult = {
      usersWithoutProfile: [],
      profilesWithoutUser: [],
    };

    // Users in user_roles but not in agent_profiles
    for (const user of (users as { email: string; role: string; name?: string }[] || [])) {
      if (!profileEmails.has(user.email.toLowerCase())) {
        mismatches.usersWithoutProfile.push({
          email: user.email,
          role: user.role,
          name: user.name || undefined,
        });
      }
    }

    // Profiles in agent_profiles but not in user_roles (excluding terminated agents)
    for (const profile of (profiles as { email: string; full_name?: string; employment_status?: string }[] || [])) {
      if (!userEmails.has(profile.email.toLowerCase())) {
        // Skip terminated agents - they're expected to not have user accounts
        if (profile.employment_status === 'Terminated') {
          continue;
        }
        mismatches.profilesWithoutUser.push({
          email: profile.email,
          full_name: profile.full_name || undefined,
          employment_status: profile.employment_status || undefined,
        });
      }
    }

    const totalMismatches = mismatches.usersWithoutProfile.length + mismatches.profilesWithoutUser.length;
    console.log(`Found ${totalMismatches} mismatches: ${mismatches.usersWithoutProfile.length} users without profiles, ${mismatches.profilesWithoutUser.length} profiles without users`);

    // If no mismatches, return early
    if (totalMismatches === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No mismatches found",
        mismatches 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get HR emails to notify
    const { data: hrUsers, error: hrError } = await supabase
      .from("user_roles")
      .select("email")
      .in("role", ["hr", "super_admin"]);

    if (hrError) {
      console.error("Error fetching HR emails:", hrError);
    }

    const hrEmails = [...new Set((hrUsers as { email: string }[] || []).map(u => u.email))];
    console.log(`Sending mismatch report to ${hrEmails.length} HR/Super Admin users`);

    if (!resendApiKey || hrEmails.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Mismatches found but no email sent (no API key or HR emails)",
        mismatches 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build email content
    const today = new Date().toLocaleDateString("en-US", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });

    let usersWithoutProfileHtml = "";
    if (mismatches.usersWithoutProfile.length > 0) {
      usersWithoutProfileHtml = `
        <h3 style="color: #dc2626; margin-top: 20px;">Users Without Agent Profile (${mismatches.usersWithoutProfile.length})</h3>
        <p style="color: #666;">These users exist in User Management but don't have a profile in Manage Agent Profiles:</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Email</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Name</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Role</th>
            </tr>
          </thead>
          <tbody>
            ${mismatches.usersWithoutProfile.map(u => `
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${u.email}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${u.name || '-'}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${u.role}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    let profilesWithoutUserHtml = "";
    if (mismatches.profilesWithoutUser.length > 0) {
      profilesWithoutUserHtml = `
        <h3 style="color: #dc2626; margin-top: 20px;">Agent Profiles Without User Account (${mismatches.profilesWithoutUser.length})</h3>
        <p style="color: #666;">These profiles exist in Manage Agent Profiles but don't have a corresponding user in User Management:</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Email</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Full Name</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${mismatches.profilesWithoutUser.map(p => `
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${p.email}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${p.full_name || '-'}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${p.employment_status || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>User/Profile Mismatch Report</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; color: #dc2626; font-size: 22px;">
            ⚠️ Daily User/Profile Mismatch Report
          </h1>
          <p style="margin: 10px 0 0 0; color: #666;">${today}</p>
        </div>
        
        <p>The following mismatches were detected between User Management and Manage Agent Profiles:</p>
        
        ${usersWithoutProfileHtml}
        ${profilesWithoutUserHtml}
        
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 30px;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            <strong>Action Required:</strong> Please review these entries and either:
          </p>
          <ul style="color: #666; font-size: 14px; margin-top: 10px;">
            <li>Create missing profiles for users in User Management</li>
            <li>Create user accounts for profiles in Manage Agent Profiles</li>
            <li>Mark profiles as "Terminated" if they should no longer have access</li>
          </ul>
        </div>
        
        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p>This is an automated daily report from VFS Agent Portal</p>
        </div>
      </body>
      </html>
    `;

    const resend = new Resend(resendApiKey);
    
    const emailResponse = await resend.emails.send({
      from: "VFS Agent Portal <noreply@updates.virtualfreelancesolutions.com>",
      to: hrEmails,
      subject: `⚠️ Daily User/Profile Mismatch Report - ${totalMismatches} issue${totalMismatches === 1 ? '' : 's'} found`,
      html: emailHtml,
    });

    console.log("Mismatch report email sent:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailSent: true,
      recipients: hrEmails.length,
      mismatches 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in check-user-profile-mismatch:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
