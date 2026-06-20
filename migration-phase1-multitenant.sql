-- ============================================================
-- THRIVE — Phase 1: Multi-tenant foundation
-- Run once in Supabase → SQL Editor (new query → paste → Run).
-- Safe to re-run. Additive: existing owner access keeps working.
-- ============================================================

-- ── 1. ORGANIZATIONS (the "business") ──────────────────────
create table if not exists organizations (
  id          uuid default uuid_generate_v4() primary key,
  name        text not null default 'My Company',
  plan        text default 'starter',          -- starter | pro | promax
  extra_seats integer default 0,
  created_at  timestamptz default now()
);

-- ── 2. MEMBERSHIPS (which login belongs to which business + role) ──
create table if not exists memberships (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references auth.users on delete cascade not null,
  org_id     uuid references organizations on delete cascade not null,
  role       text not null default 'tech',     -- admin | manager | tech
  created_at timestamptz default now(),
  unique (user_id, org_id)
);

-- ── 3. ADD org_id TO EVERY DATA TABLE ──────────────────────
alter table profiles     add column if not exists org_id uuid references organizations;
alter table customers    add column if not exists org_id uuid references organizations;
alter table jobs         add column if not exists org_id uuid references organizations;
alter table invoices     add column if not exists org_id uuid references organizations;
alter table estimates    add column if not exists org_id uuid references organizations;
alter table employees    add column if not exists org_id uuid references organizations;
alter table time_entries add column if not exists org_id uuid references organizations;
alter table messages     add column if not exists org_id uuid references organizations;
alter table job_timers   add column if not exists org_id uuid references organizations;

-- ── 4. BACKFILL: one business per existing owner, stamp all rows ──
do $$
declare
  p       record;
  new_org uuid;
begin
  for p in select id, company, settings from profiles loop
    if not exists (select 1 from memberships m where m.user_id = p.id) then
      insert into organizations (name, plan, extra_seats)
        values (
          coalesce(nullif(p.company,''), 'My Company'),
          coalesce(p.settings->>'plan', 'starter'),
          coalesce((p.settings->>'extraSeats')::int, 0)
        )
        returning id into new_org;

      insert into memberships (user_id, org_id, role) values (p.id, new_org, 'admin');

      update profiles     set org_id = new_org where id = p.id          and org_id is null;
      update customers    set org_id = new_org where user_id = p.id     and org_id is null;
      update jobs         set org_id = new_org where user_id = p.id     and org_id is null;
      update invoices     set org_id = new_org where user_id = p.id     and org_id is null;
      update estimates    set org_id = new_org where user_id = p.id     and org_id is null;
      update employees    set org_id = new_org where user_id = p.id     and org_id is null;
      update time_entries set org_id = new_org where user_id = p.id     and org_id is null;
      update messages     set org_id = new_org where user_id = p.id     and org_id is null;
      update job_timers   set org_id = new_org where user_id = p.id     and org_id is null;
    end if;
  end loop;
end $$;

-- ── 5. AUTO-TAG new rows with the inserter's org (transition safety) ──
-- So rows created before the app is org-aware (Phase 2) still get an org_id.
create or replace function set_org_id()
returns trigger language plpgsql security definer as $$
begin
  if new.org_id is null then
    select org_id into new.org_id
    from memberships where user_id = auth.uid()
    order by created_at limit 1;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['customers','jobs','invoices','estimates','employees','time_entries','messages','job_timers']
  loop
    execute format('drop trigger if exists trg_set_org on %I', t);
    execute format('create trigger trg_set_org before insert on %I for each row execute function set_org_id()', t);
  end loop;
end $$;

-- ── 6. ENABLE RLS on the new tables ────────────────────────
alter table organizations enable row level security;
alter table memberships   enable row level security;

drop policy if exists "members read their orgs" on organizations;
create policy "members read their orgs" on organizations for select
  using (id in (select org_id from memberships where user_id = auth.uid()));

drop policy if exists "admins update their org" on organizations;
create policy "admins update their org" on organizations for update
  using (id in (select org_id from memberships where user_id = auth.uid() and role = 'admin'));

drop policy if exists "users read own memberships" on memberships;
create policy "users read own memberships" on memberships for select
  using (user_id = auth.uid());

drop policy if exists "admins manage memberships" on memberships;
create policy "admins manage memberships" on memberships for all
  using (org_id in (select org_id from memberships where user_id = auth.uid() and role = 'admin'))
  with check (org_id in (select org_id from memberships where user_id = auth.uid() and role = 'admin'));

-- ── 7. ORG-BASED RLS on data tables (ADDITIVE — old policies stay) ──
-- A row is visible if it belongs to a business the caller is a member of.
do $$
declare t text;
begin
  foreach t in array array['customers','jobs','invoices','estimates','employees','time_entries','messages','job_timers']
  loop
    execute format('drop policy if exists "org members access %1$s" on %1$s', t);
    execute format(
      'create policy "org members access %1$s" on %1$s for all '
      'using (org_id in (select org_id from memberships where user_id = auth.uid())) '
      'with check (org_id in (select org_id from memberships where user_id = auth.uid()))',
      t
    );
  end loop;
end $$;

-- ============================================================
-- DONE. Old "Users see own ..." policies are intentionally kept,
-- so your current login keeps full access. Phase 2 updates the app
-- to read/write by org, then the old user-based policies retire.
-- ============================================================
