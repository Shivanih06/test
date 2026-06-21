-- ═══════════════════════════════════════════════════════════════
--  ORG-WIDE SHARED SETTINGS
--  Adds a JSON column on the organizations row to hold company-wide
--  config (price book + message templates) so every device in the
--  business loads the SAME settings instead of per-device local copies.
--
--  No new policies needed — the existing organizations RLS already covers it:
--    • "members read their orgs"  → every member's device can READ settings
--    • "admins update their org"  → only admins can WRITE settings
--
--  Idempotent: safe to run more than once.
-- ═══════════════════════════════════════════════════════════════

alter table organizations
  add column if not exists settings jsonb default '{}'::jsonb;
