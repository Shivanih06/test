-- ============================================================
-- THRIVE — Fix: "infinite recursion detected in policy for memberships"
-- Run once in Supabase → SQL Editor (new query → paste → Run).
-- Safe to re-run.
--
-- Cause: a memberships policy queried the memberships table itself.
-- Fix:   read memberships through SECURITY DEFINER helper functions
--        (owned by postgres, so they bypass RLS — no recursion).
-- ============================================================

-- ── Helper functions (no recursion) ──
create or replace function my_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select org_id from memberships where user_id = auth.uid();
$$;

create or replace function my_admin_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select org_id from memberships where user_id = auth.uid() and role = 'admin';
$$;

-- ── MEMBERSHIPS policies — rebuilt without self-reference ──
drop policy if exists "users read own memberships" on memberships;
drop policy if exists "admins manage memberships"  on memberships;
drop policy if exists "read own memberships"        on memberships;
drop policy if exists "admins read org memberships" on memberships;
drop policy if exists "admins insert memberships"   on memberships;
drop policy if exists "admins modify memberships"   on memberships;
drop policy if exists "admins remove memberships"   on memberships;

create policy "read own memberships" on memberships for select
  using (user_id = auth.uid());

create policy "admins read org memberships" on memberships for select
  using (org_id in (select my_admin_org_ids()));

create policy "admins insert memberships" on memberships for insert
  with check (org_id in (select my_admin_org_ids()));

create policy "admins modify memberships" on memberships for update
  using      (org_id in (select my_admin_org_ids()))
  with check (org_id in (select my_admin_org_ids()));

create policy "admins remove memberships" on memberships for delete
  using (org_id in (select my_admin_org_ids()));

-- ── ORGANIZATIONS policies — use helpers ──
drop policy if exists "members read their orgs" on organizations;
drop policy if exists "admins update their org" on organizations;

create policy "members read their orgs" on organizations for select
  using (id in (select my_org_ids()));

create policy "admins update their org" on organizations for update
  using (id in (select my_admin_org_ids()));

-- ── DATA TABLE policies — use helper instead of inline memberships subquery ──
do $$
declare t text;
begin
  foreach t in array array['customers','jobs','invoices','estimates','employees','time_entries','messages','job_timers']
  loop
    execute format('drop policy if exists "org members access %1$s" on %1$s', t);
    execute format(
      'create policy "org members access %1$s" on %1$s for all '
      'using (org_id in (select my_org_ids())) '
      'with check (org_id in (select my_org_ids()))',
      t
    );
  end loop;
end $$;

-- ============================================================
-- DONE. Reload the app — the membership lookup should now succeed
-- (no 500), and your role/business will resolve from the database.
-- ============================================================
