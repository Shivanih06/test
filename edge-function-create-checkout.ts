// ============================================================
// THRIVE — create-checkout  (Supabase Edge Function)
// Creates a Stripe Checkout Session for an invoice and returns
// the hosted payment URL. The Stripe SECRET key lives as a
// Supabase secret (STRIPE_SECRET_KEY) — never in the browser.
// Only logged-in users can call it.
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

    // Require a logged-in user (prevents anonymous abuse of your Stripe account)
    const url        = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin      = createClient(url, serviceKey);
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: 'Not authenticated' }, 401);

    const { amount, description, invoiceId, orgId, customerName, returnUrl } = await req.json();
    const cents = Math.round(Number(amount));
    if (!cents || cents < 50) return json({ error: 'Amount must be at least $0.50' }, 400);

    const base = (returnUrl || 'https://shivanih06.github.io/test').split('?')[0];
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', `${base}?paid=${invoiceId || ''}`);
    params.set('cancel_url', base);
    params.set('line_items[0][quantity]', '1');
    params.set('line_items[0][price_data][currency]', 'usd');
    params.set('line_items[0][price_data][unit_amount]', String(cents));
    params.set('line_items[0][price_data][product_data][name]', String(description || 'Invoice'));
    if (invoiceId)    params.set('metadata[invoice_id]', String(invoiceId));
    if (orgId)        params.set('metadata[org_id]', String(orgId));
    if (customerName) params.set('metadata[customer]', String(customerName));

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return json({ error: data.error?.message || 'Stripe error' }, 400);

    return json({ success: true, url: data.url, id: data.id });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
