import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all agent profiles with rate history
    const { data: profiles, error: profilesError } = await supabase
      .from('agent_profiles')
      .select('*')
      .not('rate_history', 'is', null);

    if (profilesError) throw profilesError;

    // Calculate date 7 days from now
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const targetDate = sevenDaysFromNow.toISOString().split('T')[0];

    const upcomingProgressions: { profile: any; entry: { date: string; rate: number } }[] = [];

    // Find profiles with rate progressions coming up in 7 days
    for (const profile of profiles || []) {
      const rateHistory = profile.rate_history as { date: string; rate: number }[];
      if (!Array.isArray(rateHistory)) continue;

      for (const entry of rateHistory) {
        if (entry.date === targetDate) {
          upcomingProgressions.push({ profile, entry });
        }
      }
    }

    if (upcomingProgressions.length === 0) {
      return new Response(JSON.stringify({ message: 'No upcoming progressions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get all admins and super admins
    const { data: adminUsers, error: adminsError } = await supabase
      .from('user_roles')
      .select('email, name')
      .in('role', ['admin', 'super_admin']);

    if (!adminUsers?.length) {
      return new Response(JSON.stringify({ message: 'No admins configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const emailsSent: string[] = [];

    for (const { profile, entry } of upcomingProgressions) {
      const agentName = profile.full_name || profile.email;
      const html = `
        <h2>Rate Progression Reminder</h2>
        <p>This is a reminder that a rate progression is coming up in 7 days.</p>
        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Agent:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${agentName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${profile.email}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Current Rate:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">$${profile.hourly_rate || 'N/A'}/hr</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>New Rate:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">$${entry.rate}/hr</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Effective Date:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${entry.date}</td></tr>
        </table>
      `;
      
      for (const admin of adminUsers) {
        await sendEmail({
          to: [admin.email],
          subject: `Upcoming Rate Progression - ${agentName}`,
          html,
        });
        emailsSent.push(admin.email);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      progressionsFound: upcomingProgressions.length,
      emailsSent: emailsSent.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
