// ============================================================
// THRIVE — invite-employee  (Supabase Edge Function)
// Handles BOTH adding (invite) and removing employees.
// Service-role key is injected automatically — paste no keys.
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

    // Validate the caller's login
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Not authenticated' }, 401);

    const body = await req.json();
    const action = body.action || 'invite';
    const orgId = body.orgId;
    if (!orgId) return json({ error: 'Missing orgId' }, 400);

    // Caller must be an ADMIN of this business
    const { data: mem } = await admin
      .from('memberships').select('role')
      .eq('user_id', user.id).eq('org_id', orgId).maybeSingle();
    if (!mem || mem.role !== 'admin') {
      return json({ error: 'Only an admin can manage employees' }, 403);
    }

    // ── REMOVE ──
    if (action === 'remove') {
      const email = body.email;
      if (!email) return json({ error: 'Missing email' }, 400);
      const { data: list } = await admin.auth.admin.listUsers();
      const target = list?.users?.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
      if (!target) return json({ success: true, note: 'no login to revoke' });

      // Revoke access to this business
      await admin.from('memberships').delete().eq('user_id', target.id).eq('org_id', orgId);

      // If they belong to no other business, delete the login entirely
      const { data: remaining } = await admin.from('memberships').select('id').eq('user_id', target.id);
      if (!remaining || remaining.length === 0) {
        await admin.auth.admin.deleteUser(target.id);
      }
      return json({ success: true });
    }

    // ── INVITE (default) ──
    const { email, firstName, lastName, role, redirectTo } = body;
    if (!email || !role) return json({ error: 'Missing email or role' }, 400);
    if (!['admin', 'manager', 'tech'].includes(role)) return json({ error: 'Invalid role' }, 400);

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

    await admin.from('memberships').upsert(
      { user_id: userId, org_id: orgId, role },
      { onConflict: 'user_id,org_id' },
    );
    return json({ success: true, userId });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
