import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download the external image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch image: ${imageResponse.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const imageBuffer = await imageResponse.arrayBuffer();

    // Determine file extension
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
    };
    const ext = extMap[contentType] || '.png';
    const fileName = `rehosted-${Date.now()}${ext}`;

    // Upload to storage using service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabaseAdmin.storage
      .from('article-attachments')
      .upload(fileName, imageBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('article-attachments')
      .getPublicUrl(data.path);

    return new Response(JSON.stringify({ newUrl: urlData.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
