-- ============================================================
-- THRIVE — RLS CLEANUP: retire the old login-based security rules
-- Keeps ONLY the business-based rule ("org members access <table>")
-- on each data table, and drops every other (old) policy.
--
-- Safe because the org-coverage check showed 0 rows missing org_id.
-- Run in Supabase → SQL Editor. Idempotent — safe to re-run.
-- ============================================================

do $$
declare
  t    text;
  pol  record;
  keep text;
begin
  foreach t in array array['customers','jobs','invoices','estimates','employees','time_entries','messages','job_timers']
  loop
    keep := 'org members access ' || t;          -- the business-based rule to KEEP
    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename  = t
        and policyname <> keep                    -- everything except the keeper = old rule
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;
  end loop;
end $$;

-- ── VERIFY: each table below should now show exactly ONE policy,
--    named "org members access <table>". Nothing else. ──
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('customers','jobs','invoices','estimates','employees','time_entries','messages','job_timers')
order by tablename, policyname;
