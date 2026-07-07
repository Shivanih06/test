-- ═══════════════════════════════════════════════════════════════
--  RECURRENCE FIELDS ON JOBS
--  So a recurring job keeps its series identity across devices /
--  after a cloud reload (was being stripped on sync, which made the
--  "delete this vs all future" choice never appear).
--  RUN THIS BEFORE deploying v90 — saving a job writes these columns.
--  Idempotent.
-- ═══════════════════════════════════════════════════════════════

alter table jobs add column if not exists recur_series_id text;
alter table jobs add column if not exists recur_master    boolean default false;
alter table jobs add column if not exists recur_child     boolean default false;

notify pgrst, 'reload schema';

-- DONE.
