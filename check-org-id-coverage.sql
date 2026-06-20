-- ============================================================
-- THRIVE — READ-ONLY CHECK (changes nothing)
-- Reports how many rows in each table are missing a business ID (org_id).
-- Run in Supabase → SQL Editor. Safe to run any number of times.
--
-- HOW TO READ THE RESULT:
--   missing_org_id = 0  → status "OK"   (that table is fully tagged)
--   missing_org_id > 0  → status "NEEDS BACKFILL"
-- We only proceed to drop the old security rules once EVERY row is OK.
-- ============================================================

select 'customers'    as table_name, count(*) as total, count(*) filter (where org_id is null) as missing_org_id from customers
union all select 'jobs',         count(*), count(*) filter (where org_id is null) from jobs
union all select 'invoices',     count(*), count(*) filter (where org_id is null) from invoices
union all select 'estimates',    count(*), count(*) filter (where org_id is null) from estimates
union all select 'employees',    count(*), count(*) filter (where org_id is null) from employees
union all select 'time_entries', count(*), count(*) filter (where org_id is null) from time_entries
union all select 'messages',     count(*), count(*) filter (where org_id is null) from messages
union all select 'job_timers',   count(*), count(*) filter (where org_id is null) from job_timers
order by missing_org_id desc, table_name;
