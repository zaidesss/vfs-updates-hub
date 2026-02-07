import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper function to get terminated agent emails
async function getTerminatedEmails(supabase: any): Promise<Set<string>> {
  const { data: terminatedProfiles, error } = await supabase
    .from('agent_profiles')
    .select('email')
    .eq('employment_status', 'Terminated');

  if (error) {
    console.error('Error fetching terminated profiles:', error);
    return new Set();
  }

  return new Set((terminatedProfiles as { email: string }[] || []).map(p => p.email.toLowerCase()));
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting daily reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all published updates
    const { data: updates, error: updatesError } = await supabase
      .from("updates")
      .select("id, title, reference_number")
      .eq("status", "published");

    if (updatesError) {
      console.error("Error fetching updates:", updatesError);
      throw updatesError;
    }

    // Get all user emails
    const { data: users, error: usersError } = await supabase
      .from("user_roles")
      .select("email");

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    // Get terminated agent emails
    const terminatedEmails = await getTerminatedEmails(supabase);
    console.log(`Found ${terminatedEmails.size} terminated agents to exclude`);

    // Get all acknowledgements
    const { data: acknowledgements, error: ackError } = await supabase
      .from("acknowledgements")
      .select("update_id, agent_email");

    if (ackError) {
      console.error("Error fetching acknowledgements:", ackError);
      throw ackError;
    }

    // Find users with unread updates (excluding terminated agents)
    const usersWithUnread: { email: string; unreadCount: number; unreadUpdates: { title: string; reference_number: string | null }[] }[] = [];

    for (const user of users || []) {
      const normalizedEmail = user.email.toLowerCase();
      
      // Skip terminated agents
      if (terminatedEmails.has(normalizedEmail)) {
        console.log(`Skipping terminated agent: ${normalizedEmail}`);
        continue;
      }

      const userAcks = acknowledgements?.filter(a => a.agent_email.toLowerCase() === normalizedEmail) || [];
      const ackedUpdateIds = userAcks.map(a => a.update_id);
      
      const unreadUpdates = updates?.filter(u => !ackedUpdateIds.includes(u.id)) || [];
      
      if (unreadUpdates.length > 0) {
        usersWithUnread.push({
          email: user.email,
          unreadCount: unreadUpdates.length,
          unreadUpdates: unreadUpdates.map(u => ({ title: u.title, reference_number: u.reference_number })),
        });
      }
    }

    console.log(`Found ${usersWithUnread.length} active users with unread updates`);

    if (usersWithUnread.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No reminders to send" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send reminder emails
    const emailPromises = usersWithUnread.map(async (user) => {
      try {
        const emailResult = await sendEmail({
          to: [user.email],
          subject: `Reminder: You have ${user.unreadCount} unread update${user.unreadCount > 1 ? 's' : ''}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Daily Reminder</h2>
              
              <p>You have <strong>${user.unreadCount}</strong> unread update${user.unreadCount > 1 ? 's' : ''} waiting for your acknowledgement:</p>
              
              <ul style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; list-style: none;">
                ${user.unreadUpdates.map(u => `<li style="padding: 8px 0; border-bottom: 1px solid #ddd;">📌 ${u.reference_number ? `<strong>${u.reference_number}</strong> - ` : ''}${u.title}</li>`).join('')}
              </ul>
              
              <p>Please log in to the VFS Updates Hub to review and acknowledge these updates.</p>
              
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                This is an automated daily reminder sent at 8:00 AM EST.
              </p>
            </div>
          `,
        });

        if (emailResult.success) {
          // Log the reminder
          await supabase.from("reminder_logs").insert({
            user_email: user.email,
            reminder_type: "daily",
          });
          console.log(`Reminder sent to ${user.email}`);
          return { email: user.email, success: true };
        } else {
          console.error(`Failed to send reminder to ${user.email}:`, emailResult.error);
          return { email: user.email, success: false, error: emailResult.error };
        }
      } catch (error: any) {
        console.error(`Failed to send reminder to ${user.email}:`, error);
        return { email: user.email, success: false, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Sent ${successCount}/${usersWithUnread.length} reminders successfully`);

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount,
      total: usersWithUnread.length,
      results 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-reminders function:", error);
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
