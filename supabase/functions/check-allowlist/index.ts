import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Checking allowlist for: ${normalizedEmail}`);

    // Use service role to bypass RLS and check user_roles table
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('user_roles')
      .select('email, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If not in user_roles, deny access
    if (!data) {
      console.log(`Allowlist result for ${normalizedEmail}: DENIED (not in user_roles)`);
      return new Response(JSON.stringify({ allowed: false, role: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if agent has a profile with terminated status
    const { data: profile, error: profileError } = await supabase
      .from('agent_profiles')
      .select('employment_status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking profile:', profileError);
      // Continue anyway - profile check is for terminated agents
    }

    // If agent has a profile with Terminated status, deny login
    if (profile?.employment_status === 'Terminated') {
      console.log(`Allowlist result for ${normalizedEmail}: DENIED (account terminated)`);
      return new Response(JSON.stringify({ 
        allowed: false, 
        role: data.role, 
        reason: 'Account has been deactivated. Please contact your administrator.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Allowlist result for ${normalizedEmail}: ALLOWED`);

    return new Response(JSON.stringify({ allowed: true, role: data.role }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
