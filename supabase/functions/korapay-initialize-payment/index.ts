import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const KORAPAY_BASE_URL = 'https://api.korapay.com/merchant/api/v1';

type InitializeBody = { planId?: string };

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
    const korapaySecret = Deno.env.get('KORAPAY_SECRET_KEY');

    if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured');
    if (!supabaseAnonKey) throw new Error('SUPABASE_ANON_KEY is not configured');
    if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    if (!korapaySecret) throw new Error('KORAPAY_SECRET_KEY is not configured');

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

    const { planId }: InitializeBody = await req.json();
    if (!planId || planId === 'free') {
      return new Response(JSON.stringify({ error: 'Invalid paid plan selected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const [{ data: planRow, error: planError }, { data: profileRow, error: profileError }] = await Promise.all([
      adminClient
        .from('subscription_plans')
        .select('id,name,price,is_active')
        .eq('id', planId)
        .eq('is_active', true)
        .maybeSingle(),
      adminClient.from('profiles').select('name,email').eq('user_id', user.id).maybeSingle(),
    ]);

    if (planError || !planRow) {
      return new Response(JSON.stringify({ error: 'Selected plan is unavailable' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profileError || !profileRow?.email) {
      return new Response(JSON.stringify({ error: 'User profile/email not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reference = `JBW-${user.id.slice(0, 8)}-${Date.now()}`;
    const callbackBase = req.headers.get('origin') ?? 'https://id-preview--7d7b4c90-9b41-46f8-97b4-9771b4eaafd5.lovable.app';

    const payload = {
      amount: Number(planRow.price),
      currency: 'NGN',
      reference,
      redirect_url: `${callbackBase}/pricing?payment=success`,
      notification_url: `${supabaseUrl}/functions/v1/korapay-webhook`,
      customer: {
        name: profileRow.name,
        email: profileRow.email,
      },
      metadata: {
        user_id: user.id,
        plan_id: planId,
      },
    };

    const koraRes = await fetch(`${KORAPAY_BASE_URL}/charges/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${korapaySecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const koraData = await koraRes.json();
    if (!koraRes.ok || !koraData?.status || !koraData?.data?.checkout_url) {
      throw new Error(`Korapay initialize failed [${koraRes.status}]: ${JSON.stringify(koraData)}`);
    }

    return new Response(
      JSON.stringify({
        checkoutUrl: koraData.data.checkout_url,
        reference: koraData.data.reference ?? reference,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});