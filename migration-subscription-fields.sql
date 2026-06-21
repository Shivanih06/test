-- ═══════════════════════════════════════════════════════════════
--  SUBSCRIPTION FIELDS
--  Tracks which plan a business is on and links it to its Stripe
--  subscription, so the webhook can keep subscription_status in sync.
--  (subscription_status itself was added in migration-subscriptions.sql.)
--  Idempotent.
-- ═══════════════════════════════════════════════════════════════

alter table organizations add column if not exists plan text;
alter table organizations add column if not exists stripe_customer_id text;
alter table organizations add column if not exists stripe_subscription_id text;
