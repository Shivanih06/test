-- ═══════════════════════════════════════════════════════════════
--  PER-JOB EXTRAS → CLOUD SYNC
--  Moves the data that used to live only on one device into Supabase so
--  every phone/computer in the business sees the same thing:
--    • schedule + recurrence settings   • discounts        • tax rate
--    • payments collected               • job cost items   • line items
--    • the multi-person "Assigned To" list
--  Stored as ONE json blob per job. The row id = the job's id (1 row per job),
--  so it upserts and deletes right alongside the job.
--
--  RLS mirrors every other table: anyone who is a member of the job's
--  organization can read & write it.
--
--  Idempotent: safe to run more than once. Run it in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════

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

-- DONE.
