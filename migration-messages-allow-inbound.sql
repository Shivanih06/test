-- ═══════════════════════════════════════════════════════════════
--  ALLOW INBOUND MESSAGES (NO SENDING STAFF USER)
--  Outbound messages always have a user_id (whoever in Thrive sent it). An INBOUND
--  text from a customer has no such user — nobody on staff "sent" it. If user_id is
--  currently required, that would silently block every inbound message from saving.
--  Idempotent — safe to run more than once.
-- ═══════════════════════════════════════════════════════════════

alter table messages alter column user_id drop not null;

notify pgrst, 'reload schema';

-- DONE.
