-- ═══════════════════════════════════════════════════════════════
--  REPORTS ADD-ON ENTITLEMENT
--  reports_addon=true means the business is paying for the Reports
--  add-on. The Stripe webhook flips this on purchase / cancellation,
--  so unlocking is driven by real billing, not an app flag.
--  Idempotent — safe to run more than once.
-- ═══════════════════════════════════════════════════════════════

alter table organizations add column if not exists reports_addon boolean default false;

notify pgrst, 'reload schema';

-- DONE.
