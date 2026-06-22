-- ═══════════════════════════════════════════════════════════════
--  JOB CONFIRMED FLAG
--  An estimate is just an UNCONFIRMED job. confirmed=false means it's
--  an estimate (a scheduled visit, not yet a booked job); confirmed=true
--  is a normal job. Existing jobs default to true (they're real jobs).
--  Idempotent.
-- ═══════════════════════════════════════════════════════════════

alter table jobs add column if not exists confirmed boolean default true;
