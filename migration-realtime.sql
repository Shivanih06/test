-- ═══════════════════════════════════════════════════════════════
--  ENABLE REALTIME (optional but recommended)
--  Adds Thrive's synced tables to the Realtime publication so a change
--  on one device instantly pokes other devices to refresh. RLS still
--  applies (each device only receives its own org's rows).
--  Without this, sync still works via the 15s poll + pull-to-refresh —
--  this just makes cross-device updates feel instant.
--  Idempotent — safe to run more than once.
-- ═══════════════════════════════════════════════════════════════

do $$
declare t text;
begin
  foreach t in array array['jobs','customers','invoices','time_entries','job_extras'] loop
    if to_regclass('public.'||t) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname='supabase_realtime' and schemaname='public' and tablename=t
       )
    then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- DONE.
