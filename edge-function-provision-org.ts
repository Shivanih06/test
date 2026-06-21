// ============================================================
// THRIVE — provision-org  (Supabase Edge Function)
// Auto-creates a workspace for a brand-new signup: an organization
// + an ADMIN membership for the signing-in user. Runs with the
// service role so it can set this up securely. Idempotent — if the
// user already belongs to a business, it just returns that.
// This is how self-serve signup works with zero manual setup.
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
    const url        = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin      = createClient(url, serviceKey);

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: 'Not authenticated' }, 401);

    // Already belongs to a business? Return it (idempotent — never double-create).
    const { data: mems } = await admin
      .from('memberships').select('org_id, role').eq('user_id', user.id).limit(1);
    if (mems && mems.length) {
      return json({ org_id: mems[0].org_id, role: mems[0].role, existed: true });
    }

    const { companyName } = await req.json().catch(() => ({}));

    // Create the organization
    const { data: org, error: orgErr } = await admin
      .from('organizations').insert({ name: companyName || 'My Company' }).select('id').single();
    if (orgErr) return json({ error: orgErr.message }, 400);

    // Make this user the ADMIN of their new workspace
    const { error: memErr } = await admin
      .from('memberships').insert({ user_id: user.id, org_id: org.id, role: 'admin' });
    if (memErr) return json({ error: memErr.message }, 400);

    return json({ org_id: org.id, role: 'admin', created: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
