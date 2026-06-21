// ============================================================
// THRIVE — stripe-webhook  (Supabase Edge Function)
// Stripe calls this when subscriptions change. It keeps each
// organization's subscription_status in sync automatically:
//   trialing/active → unlock,  past_due/canceled → lock.
// This removes you from the loop — accounts activate themselves.
//
// IMPORTANT SETUP:
//  • Deploy this function with "Verify JWT" OFF (Stripe can't send a
//    Supabase token). In the Supabase function settings, turn off
//    "Enforce JWT verification" for stripe-webhook.
//  • Set the secret STRIPE_WEBHOOK_SECRET (the signing secret Stripe
//    gives you when you create the webhook endpoint).
//  • STRIPE_SECRET_KEY must also be set (already is).
// ============================================================

import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Stripe subscription status → our gate status
function mapStatus(s: string): string {
  if (s === 'trialing') return 'trialing';
  if (s === 'active') return 'active';
  if (s === 'past_due' || s === 'unpaid') return 'past_due';
  return 'canceled'; // canceled, incomplete_expired, etc.
}

async function updateOrg(orgId: string | null | undefined, fields: Record<string, unknown>) {
  if (!orgId) return;
  await admin.from('organizations').update(fields).eq('id', orgId);
}

Deno.serve(async (req) => {
  const sig       = req.headers.get('stripe-signature');
  const whSecret  = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!sig || !whSecret) return new Response('Missing signature/secret', { status: 400 });

  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, whSecret, undefined, cryptoProvider);
  } catch (e) {
    return new Response(`Bad signature: ${(e as Error)?.message}`, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s: any = event.data.object;
      const orgId = s.metadata?.org_id || s.client_reference_id;
      let status = 'active';
      let plan   = s.metadata?.plan || null;
      if (s.subscription) {
        const sub: any = await stripe.subscriptions.retrieve(s.subscription);
        status = mapStatus(sub.status);
        plan   = sub.metadata?.plan || plan;
      }
      await updateOrg(orgId, {
        subscription_status:    status,
        plan,
        stripe_customer_id:     s.customer ?? null,
        stripe_subscription_id: s.subscription ?? null,
      });
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub: any = event.data.object;
      const orgId  = sub.metadata?.org_id;
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : mapStatus(sub.status);
      const fields: Record<string, unknown> = { subscription_status: status };
      if (sub.metadata?.plan) fields.plan = sub.metadata.plan;
      await updateOrg(orgId, fields);
    }
    return new Response('ok', { status: 200 });
  } catch (e) {
    return new Response(`error: ${(e as Error)?.message ?? e}`, { status: 500 });
  }
});
