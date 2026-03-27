import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const KORAPAY_BASE_URL = 'https://api.korapay.com/merchant/api/v1';

type VerifyBody = { reference?: string };

const fetchChargeVerification = async (reference: string, secret: string) => {
  const urls = [`${KORAPAY_BASE_URL}/charges/${reference}`, `${KORAPAY_BASE_URL}/charges/verify/${reference}`];

  let lastError = '';
  for (const url of urls) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    const body = await response.text();
    let data: any = null;
    try {
      data = body ? JSON.parse(body) : null;
    } catch {
      data = body;
    }

    if (response.ok && data?.status) {
      return data;
    }

    lastError = `Korapay verify failed [${response.status}] at ${url}: ${typeof data === 'string' ? data : JSON.stringify(data)}`;
  }

  throw new Error(lastError || 'Unable to verify transaction');
};

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

    const { reference }: VerifyBody = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: 'Payment reference is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verification = await fetchChargeVerification(reference, korapaySecret);
    const charge = verification?.data ?? {};
    const status = String(charge?.status ?? '').toLowerCase();

    if (!['success', 'successful', 'completed', 'paid'].includes(status)) {
      return new Response(JSON.stringify({ success: false, message: `Payment not successful (${status || 'unknown'})` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const metadata = charge?.metadata ?? {};
    const planId = metadata?.plan_id;
    const paidUserId = metadata?.user_id;

    if (!planId || !paidUserId) {
      throw new Error('Missing plan metadata in verified payment');
    }

    if (paidUserId !== user.id) {
      return new Response(JSON.stringify({ error: 'Payment reference does not belong to this user' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error: assignError } = await adminClient.rpc('assign_user_plan', {
      _user_id: user.id,
      _plan_id: planId,
    });

    if (assignError) {
      throw new Error(`Failed to assign plan: ${assignError.message}`);
    }

    return new Response(JSON.stringify({ success: true, planId }), {
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