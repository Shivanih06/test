// ============================================================
// THRIVE — send-sms  (Supabase Edge Function)
// Sends an SMS via Twilio. Credentials live as Supabase secrets
// (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER) —
// never in the browser. Only logged-in users can call it.
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
    const sid         = Deno.env.get('TWILIO_ACCOUNT_SID');
    const token       = Deno.env.get('TWILIO_AUTH_TOKEN');
    const defaultFrom = Deno.env.get('TWILIO_FROM_NUMBER');
    if (!sid || !token || !defaultFrom) {
      return json({ error: 'SMS not configured (missing Twilio secrets)' }, 500);
    }

    // Require a logged-in user (prevents anonymous abuse of your Twilio account)
    const url        = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin      = createClient(url, serviceKey);
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: 'Not authenticated' }, 401);

    const { to, body, from } = await req.json();
    if (!to || !body) return json({ error: 'Missing recipient or message' }, 400);

    // 'from' can later be a per-business number; for now it defaults to the platform number.
    const fromNum = from || defaultFrom;
    const creds   = btoa(`${sid}:${token}`);
    const params  = new URLSearchParams({ To: String(to), From: String(fromNum), Body: String(body) });

    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method:  'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return json({ error: data.message || 'Twilio send failed', code: data.code }, 400);

    return json({ success: true, sid: data.sid });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
