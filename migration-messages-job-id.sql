-- ═══════════════════════════════════════════════════════════════
--  JOB REFERENCE ON MESSAGES
--  Lets a sent message (On My Way, reschedule notice, invoice, review request) link
--  back to the job it was about, so tapping it in the Messages page can open that
--  job directly instead of just the customer.
--  Idempotent — safe to run more than once.
-- ═══════════════════════════════════════════════════════════════

alter table messages add column if not exists job_id text;

notify pgrst, 'reload schema';

-- DONE.
