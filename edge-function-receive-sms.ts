// Supabase Edge Function: receive-sms
// Twilio calls this the moment a customer texts your business number back — this is
// what makes messaging genuinely two-way instead of send-only.
//
// SETUP:
// 1. Deploy in Supabase → Edge Functions → new function "receive-sms" → paste this.
//    IMPORTANT: turn "Verify JWT" OFF for this one function — Twilio can't send a
//    Supabase login token, it authenticates a different way (signature below).
// 2. In the Twilio Console → Phone Numbers → Manage → Active Numbers → click your
//    Thrive number → under "Messaging Configuration", set "A message comes in" to
//    Webhook, method POST, and paste this function's URL:
//      https://<your-project-ref>.supabase.co/functions/v1/receive-sms
// 3. No new secrets needed — this reuses TWILIO_AUTH_TOKEN (already set for sending)
//    and the SUPABASE_SERVICE_ROLE_KEY Supabase provides automatically to every
//    Edge Function.
//
// SECURITY: every request is verified against Twilio's official signature algorithm
// (HMAC-SHA1 of the URL + sorted form fields, using your Auth Token) so this endpoint
// can't be spoofed by someone else POSTing fake "customer replies."

import { createClient } from 'jsr:@supabase/supabase-js@2';

// Supabase's edge runtime reports req.url as its own internal view of the request
// (wrong scheme, missing /functions/v1/ prefix) — not the real public address Twilio
// actually called and signs against. Use the real one explicitly instead of trusting
// req.url, or the signature will never match no matter how correctly it's computed.
const PUBLIC_WEBHOOK_URL = 'https://znjclglbjifracvrzkik.supabase.co/functions/v1/receive-sms';

function toTwiML(body = '') {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

async function verifyTwilioSignature(req: Request, authToken: string, url: string, params: Record<string,string>): Promise<{verified: boolean, computed: string, received: string | null, dataUsed: string}> {
  const signature = req.headers.get('X-Twilio-Signature');
  if (!signature) return { verified: false, computed: '', received: null, dataUsed: url };
  // Twilio's algorithm: url + each sorted "key"+"value" appended, HMAC-SHA1 with the
  // auth token, base64-encoded, compared to the X-Twilio-Signature header.
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) data += k + params[k];
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(authToken), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
  return { verified: computed === signature, computed, received: signature, dataUsed: data };
}

Deno.serve(async (req) => {
  try {
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (!authToken) return toTwiML(); // not configured yet — quietly no-op rather than error to Twilio

    const bodyText = await req.text();
    const params: Record<string,string> = {};
    for (const [k, v] of new URLSearchParams(bodyText)) params[k] = v;

    const url = PUBLIC_WEBHOOK_URL; // the real public address Twilio calls and signs against
    const check = await verifyTwilioSignature(req, authToken, url, params);
    if (!check.verified) {
      console.log('receive-sms SIGNATURE MISMATCH — url used:', url, '| received sig:', check.received, '| computed sig:', check.computed);
      return new Response('Invalid signature', { status: 403 });
    }

    const fromRaw = (params['From'] || '').replace(/\D/g, '');
    const bodyIn  = params['Body'] || '';
    const from10  = fromRaw.slice(-10); // last 10 digits, to match however the customer's number is stored
    if (!from10 || !bodyIn) return toTwiML();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Find the customer (and therefore the org) this number belongs to. If more than one
    // customer shares this phone number (duplicate records), pick the most recently
    // created one — a deliberate, deterministic choice rather than whatever order the
    // database happens to return, which was the bug: an inbound reply could silently land
    // under the "wrong" duplicate customer instead of the one being watched in the UI.
    const { data: customers } = await admin
      .from('customers')
      .select('id, org_id, phone, created_at')
      .ilike('phone', `%${from10}`)
      .order('created_at', { ascending: false });
    const candidates = (customers || []).filter((c: any) => (c.phone || '').replace(/\D/g,'').slice(-10) === from10);
    const match = candidates[0];
    if (candidates.length > 1) {
      console.log('receive-sms: phone', from10, 'matches', candidates.length, 'customers — using most recent:', match.id);
    }

    if (!match) {
      console.log('receive-sms: no customer match for', from10, '— message dropped');
      return toTwiML();
    }

    // Best guess at which job this reply is about: that customer's most recent job.
    // Not certain — but usually right, and lets staff jump straight to context.
    const { data: recentJobs } = await admin
      .from('jobs')
      .select('id, date')
      .eq('customer_id', match.id)
      .order('date', { ascending: false })
      .limit(1);
    const guessedJobId = recentJobs && recentJobs[0] ? recentJobs[0].id : null;

    const { error: insertErr } = await admin.from('messages').insert({
      id: crypto.randomUUID(),
      org_id: match.org_id,
      customer_id: match.id,
      text: bodyIn,
      sent_at: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: 'sms',
      direction: 'inbound',
      date: new Date().toISOString().slice(0, 10),
      job_id: guessedJobId,
    });
    if (insertErr) {
      console.error('receive-sms: INSERT FAILED —', insertErr.message, JSON.stringify(insertErr));
    } else {
      console.log('receive-sms: inbound message inserted OK for customer', match.id);
    }

    return toTwiML(); // empty <Response/> — no auto-reply; staff reply from Thrive's Messages page
  } catch (e) {
    console.error('receive-sms error:', e);
    return toTwiML(); // fail quiet to Twilio either way — don't let a bug show as a broken text to the customer
  }
});
