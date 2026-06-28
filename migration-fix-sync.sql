-- ═══════════════════════════════════════════════════════════════
--  FIX SYNC — run once in the Supabase SQL editor
--  1) Adds the 'confirmed' column the app sends on every job
--     (without it, ALL job saves fail with PGRST204).
--  2) Ensures the job_extras table exists (per-job schedule/recurrence,
--     discounts, payments, costs, line items, assignees).
--  3) Tells PostgREST to refresh its schema cache immediately.
--  Idempotent: safe to run more than once.
-- ═══════════════════════════════════════════════════════════════

-- 1) Missing column on jobs (estimate = confirmed:false, job = true)
alter table jobs add column if not exists confirmed boolean default true;

-- 2) Per-job extras table (one JSON blob per job)
create table if not exists job_extras (
  id         uuid primary key,
  org_id     uuid,
  user_id    uuid,
  data       jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists job_extras_org_idx on job_extras (org_id);
alter table job_extras enable row level security;
drop policy if exists "org members access job_extras" on job_extras;
create policy "org members access job_extras" on job_extras for all
  using      (org_id in (select org_id from memberships where user_id = auth.uid()))
  with check (org_id in (select org_id from memberships where user_id = auth.uid()));

-- 3) Refresh PostgREST's schema cache so the new column is visible right away
notify pgrst, 'reload schema';

-- DONE.
