-- ═══════════════════════════════════════════════════════════════
--  TIME ENTRIES (clock in/out) → CLOUD
--  Lets admins/managers see every employee's punches across devices,
--  including the GPS location captured at clock-in and clock-out
--  (when the "record clock location" setting is on).
--  Idempotent.
-- ═══════════════════════════════════════════════════════════════

create table if not exists time_entries (
  id         text primary key,
  org_id     uuid,
  user_id    uuid,
  emp_id     text,
  date       text,
  clock_in   timestamptz,
  clock_out  timestamptz,
  type       text default 'work',
  in_lat     double precision,
  in_lng     double precision,
  out_lat    double precision,
  out_lng    double precision,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- If the table was created by an earlier version WITHOUT the location columns,
-- `create table if not exists` above won't add them — so ensure them explicitly:
alter table time_entries add column if not exists in_lat  double precision;
alter table time_entries add column if not exists in_lng  double precision;
alter table time_entries add column if not exists out_lat double precision;
alter table time_entries add column if not exists out_lng double precision;

create index if not exists time_entries_org_idx on time_entries (org_id);

alter table time_entries enable row level security;

drop policy if exists "org members access time_entries" on time_entries;
create policy "org members access time_entries" on time_entries for all
  using      (org_id in (select org_id from memberships where user_id = auth.uid()))
  with check (org_id in (select org_id from memberships where user_id = auth.uid()));

notify pgrst, 'reload schema';

-- DONE.
