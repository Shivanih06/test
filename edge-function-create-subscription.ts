// ============================================================
// THRIVE — create-subscription  (Supabase Edge Function)
// Starts a Stripe Checkout in SUBSCRIPTION mode for a chosen tier
// (Starter / Pro / Pro Max) with a 14-day free trial. The plan's
// Stripe Price IDs live as Supabase secrets:
//   STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_PROMAX
// (STRIPE_SECRET_KEY is already set.) Only logged-in users can call it.
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'Stripe not configured (missing STRIPE_SECRET_KEY)' }, 500);

    const prices: Record<string, string | undefined> = {
      starter: Deno.env.get('STRIPE_PRICE_STARTER'),
      pro:     Deno.env.get('STRIPE_PRICE_PRO'),
      promax:  Deno.env.get('STRIPE_PRICE_PROMAX'),
      reports: Deno.env.get('STRIPE_PRICE_REPORTS'),   // $29.99/mo Reports add-on
    };

    // Require a logged-in user
    const url        = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin      = createClient(url, serviceKey);
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: 'Not authenticated' }, 401);

    const { tier, orgId, returnUrl } = await req.json();
    const priceId = prices[String(tier)];
    if (!priceId) return json({ error: `Plan "${tier}" is not set up yet (missing price).` }, 400);

    const base = (returnUrl || 'https://shivanih06.github.io/test').split('?')[0];
    const isAddon = String(tier) === 'reports';
    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('line_items[0][price]', priceId);
    params.set('line_items[0][quantity]', '1');
    if (isAddon) {
      // Add-on: charge right away (no trial), tag it so the webhook flips reports_addon.
      params.set('subscription_data[metadata][org_id]', orgId || '');
      params.set('subscription_data[metadata][type]', 'reports_addon');
      params.set('metadata[org_id]', orgId || '');
      params.set('metadata[type]', 'reports_addon');
    } else {
      params.set('subscription_data[trial_period_days]', '14');
      params.set('subscription_data[metadata][org_id]', orgId || '');
      params.set('subscription_data[metadata][plan]', String(tier));
      params.set('metadata[org_id]', orgId || '');
      params.set('metadata[plan]', String(tier));
    }
    params.set('client_reference_id', orgId || '');
    params.set('allow_promotion_codes', 'true');
    if (user.email) params.set('customer_email', user.email);
    params.set('success_url', `${base}?${isAddon ? 'reports=1' : 'subscribed=1'}`);
    params.set('cancel_url', base);

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return json({ error: data.error?.message || 'Stripe error' }, 400);

    return json({ success: true, url: data.url });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
