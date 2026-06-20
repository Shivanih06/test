// ============================================================
// THRIVE — invite-employee  (Supabase Edge Function)
// Creates/invites a login, verifies the caller is an admin of the
// business, and links the new user to that business with their role.
//
// Service-role + anon keys are injected automatically by Supabase —
// you do NOT paste any keys here.
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
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey);

    // 1. Who is calling? (validate their login token)
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Not authenticated' }, 401);

    // 2. Read the request
    const { email, firstName, lastName, role, orgId, redirectTo } = await req.json();
    if (!email || !orgId || !role) return json({ error: 'Missing email, orgId, or role' }, 400);
    if (!['admin', 'manager', 'tech'].includes(role)) return json({ error: 'Invalid role' }, 400);

    // 3. The caller must be an ADMIN of this business
    const { data: mem } = await admin
      .from('memberships').select('role')
      .eq('user_id', user.id).eq('org_id', orgId).maybeSingle();
    if (!mem || mem.role !== 'admin') {
      return json({ error: 'Only an admin can invite employees' }, 403);
    }

    // 4. Invite (or find an existing) user
    let userId: string | undefined;
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { first_name: firstName, last_name: lastName, role, org_id: orgId },
      redirectTo: redirectTo || undefined,
    });
    if (inviteErr) {
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
      if (!existing) return json({ error: inviteErr.message }, 400);
      userId = existing.id;
    } else {
      userId = invited?.user?.id;
    }
    if (!userId) return json({ error: 'Could not create or find user' }, 400);

    // 5. Link them to the business with their role
    await admin.from('memberships').upsert(
      { user_id: userId, org_id: orgId, role },
      { onConflict: 'user_id,org_id' },
    );

    return json({ success: true, userId });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
