-- ═══════════════════════════════════════════════════════════════
--  SUBSCRIPTION GATING
--  Adds subscription_status to organizations so access can be gated
--  on having an active plan (no plan = no access; no free demo accounts).
--
--  Safe + idempotent:
--    1. Add the column with NO default → existing rows become NULL.
--    2. Backfill existing businesses to 'active' (grandfathered — never
--       lock out anyone already using Thrive). Only touches NULLs, so
--       re-running won't reactivate a genuinely-inactive customer.
--    3. Set the default to 'inactive' so NEW signups start locked until
--       they subscribe.
-- ═══════════════════════════════════════════════════════════════

alter table organizations add column if not exists subscription_status text;

update organizations set subscription_status = 'active' where subscription_status is null;

alter table organizations alter column subscription_status set default 'inactive';
