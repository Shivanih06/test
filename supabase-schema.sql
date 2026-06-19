-- =============================================
-- HaulPro — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES (company settings per user) ──
create table if not exists profiles (
  id            uuid references auth.users on delete cascade primary key,
  name          text,
  company       text default 'Junk Genies',
  phone         text,
  email         text,
  initials      text,
  plan          text default 'solo',
  settings      jsonb default '{}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── CUSTOMERS ──
create table if not exists customers (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  first_name    text not null,
  last_name     text,
  phone         text,
  email         text,
  address       text,
  notes         text,
  client_type   text default 'residential',
  lead_source   text,
  points        integer default 0,
  total_spent   numeric default 0,
  jobs_count    integer default 0,
  since         date default current_date,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── JOBS ──
create table if not exists jobs (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  customer_id   uuid references customers on delete cascade,
  date          date not null,
  time          text,
  time_end      text,
  service       text,
  address       text,
  notes         text,
  price         numeric default 0,
  status        text default 'scheduled',
  payment       text default 'invoice',
  paid          boolean default false,
  tech_id       text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── INVOICES ──
create table if not exists invoices (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  job_id        uuid references jobs on delete cascade,
  customer_id   uuid references customers on delete cascade,
  date          date default current_date,
  items         jsonb default '[]',
  status        text default 'draft',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── ESTIMATES ──
create table if not exists estimates (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  customer_id   uuid references customers on delete cascade,
  date          date default current_date,
  valid_days    integer default 30,
  service       text,
  address       text,
  price         numeric default 0,
  notes         text,
  tech_id       text,
  status        text default 'draft',
  converted_job_id uuid,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── EMPLOYEES ──
create table if not exists employees (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  name          text not null,
  role          text default 'technician',
  pin           text,
  color         text default '#1a6fdb',
  initials      text,
  active        boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── TIME ENTRIES ──
create table if not exists time_entries (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  emp_id        uuid references employees on delete cascade,
  date          date not null,
  clock_in      timestamptz,
  clock_out     timestamptz,
  type          text default 'work',
  created_at    timestamptz default now()
);

-- ── MESSAGES ──
create table if not exists messages (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  customer_id   uuid references customers on delete cascade,
  text          text,
  sent_at       text,
  type          text,
  direction     text default 'outbound',
  date          date default current_date,
  created_at    timestamptz default now()
);

-- ── JOB TIMERS ──
create table if not exists job_timers (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  job_id        uuid references jobs on delete cascade,
  started_at    bigint,
  elapsed       bigint default 0,
  running       boolean default false,
  updated_at    timestamptz default now()
);

-- ── ROW LEVEL SECURITY (users only see their own data) ──
alter table profiles     enable row level security;
alter table customers    enable row level security;
alter table jobs         enable row level security;
alter table invoices     enable row level security;
alter table estimates    enable row level security;
alter table employees    enable row level security;
alter table time_entries enable row level security;
alter table messages     enable row level security;
alter table job_timers   enable row level security;

-- Policies — each user only sees their own rows
create policy "Users see own profiles"     on profiles     for all using (auth.uid() = id);
create policy "Users see own customers"    on customers    for all using (auth.uid() = user_id);
create policy "Users see own jobs"         on jobs         for all using (auth.uid() = user_id);
create policy "Users see own invoices"     on invoices     for all using (auth.uid() = user_id);
create policy "Users see own estimates"    on estimates    for all using (auth.uid() = user_id);
create policy "Users see own employees"    on employees    for all using (auth.uid() = user_id);
create policy "Users see own time_entries" on time_entries for all using (auth.uid() = user_id);
create policy "Users see own messages"     on messages     for all using (auth.uid() = user_id);
create policy "Users see own job_timers"   on job_timers   for all using (auth.uid() = user_id);

-- ── INDEXES for performance ──
create index if not exists idx_jobs_user_date     on jobs(user_id, date);
create index if not exists idx_jobs_customer      on jobs(customer_id);
create index if not exists idx_customers_user     on customers(user_id);
create index if not exists idx_invoices_user      on invoices(user_id);
create index if not exists idx_messages_customer  on messages(customer_id);
create index if not exists idx_time_entries_emp   on time_entries(emp_id, date);

-- ── TRIGGER: auto-update updated_at ──
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_profiles     before update on profiles     for each row execute function update_updated_at();
create trigger trg_customers    before update on customers    for each row execute function update_updated_at();
create trigger trg_jobs         before update on jobs         for each row execute function update_updated_at();
create trigger trg_invoices     before update on invoices     for each row execute function update_updated_at();
create trigger trg_estimates    before update on estimates    for each row execute function update_updated_at();
create trigger trg_employees    before update on employees    for each row execute function update_updated_at();
