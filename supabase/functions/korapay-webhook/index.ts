import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const verifyWebhookSignature = async (rawBody: string, signature: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const hashHex = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex === signature;
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookSecret = Deno.env.get('KORAPAY_WEBHOOK_SECRET');

    if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured');
    if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    if (!webhookSecret) throw new Error('KORAPAY_WEBHOOK_SECRET is not configured');

    const signature = req.headers.get('x-korapay-signature') ?? req.headers.get('X-Korapay-Signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing Kora signature header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.text();
    const isValidSignature = await verifyWebhookSignature(rawBody, signature, webhookSecret);

    if (!isValidSignature) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};
    const event = String(payload?.event ?? '').toLowerCase();

    if (event !== 'charge.success') {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const metadata = payload?.data?.metadata ?? {};
    const userId = metadata?.user_id;
    const planId = metadata?.plan_id;

    if (!userId || !planId) {
      return new Response(JSON.stringify({ error: 'Webhook payload missing metadata user_id/plan_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: assignError } = await adminClient.rpc('assign_user_plan', {
      _user_id: userId,
      _plan_id: planId,
    });

    if (assignError) {
      throw new Error(`Failed to assign plan from webhook: ${assignError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
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