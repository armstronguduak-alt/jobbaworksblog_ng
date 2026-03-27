import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type GenerateRequest = {
  topic?: string;
  category?: string;
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !lovableKey) {
      throw new Error('Missing required environment secrets');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRow } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Only admins can generate articles' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { topic, category }: GenerateRequest = await req.json();
    if (!topic || !category) {
      return new Response(JSON.stringify({ error: 'topic and category are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content:
              'You write high-quality, original, ad-monetization-safe blog content. Output strict JSON only with keys: title, metaTitle, metaDescription, excerpt, contentHtml, focusKeywords, conclusion. Ensure 800-1200 words total in contentHtml. Use readable language, include H2/H3 structure, avoid harmful/copyrighted claims, and include internal links placeholders like /category/Technology or /plans where relevant.',
          },
          {
            role: 'user',
            content: `Create an SEO-optimized article for JobbaWorksBlog. Topic: "${topic}". Category: "${category}".`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit reached. Please try again shortly.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits required. Please top up workspace usage.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const errText = await aiResponse.text();
      throw new Error(`AI generation failed: ${errText}`);
    }

    const aiJson = await aiResponse.json();
    const rawContent = aiJson?.choices?.[0]?.message?.content ?? '';

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error('Model returned invalid JSON format');
    }

    const categoryRow = await adminClient
      .from('categories')
      .select('id')
      .eq('name', category)
      .eq('is_active', true)
      .maybeSingle();

    if (!categoryRow.data?.id) {
      throw new Error(`Category not found or inactive: ${category}`);
    }

    const title = parsed.title || topic;
    const slug = `${slugify(title)}-${Date.now()}`;

    const { data: inserted, error: insertError } = await adminClient
      .from('posts')
      .insert({
        author_user_id: user.id,
        category_id: categoryRow.data.id,
        title,
        slug,
        excerpt: parsed.excerpt || parsed.metaDescription || 'SEO article draft',
        content: parsed.contentHtml || `<p>${topic}</p>`,
        featured_image: `https://picsum.photos/seed/${encodeURIComponent(topic)}/1200/600`,
        status: 'pending',
        moderation_summary: 'AI-generated draft awaiting admin review.',
        moderation_flags: [],
        seo_meta_title: parsed.metaTitle || title,
        seo_meta_description: parsed.metaDescription || parsed.excerpt || 'SEO article for JobbaWorksBlog',
      })
      .select('id')
      .single();

    if (insertError) throw new Error(insertError.message);

    return new Response(JSON.stringify({ success: true, postId: inserted.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
