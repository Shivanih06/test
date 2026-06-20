-- =============================================
-- THRIVE — Employee onboarding fields
-- Run this in Supabase → SQL Editor (one time).
-- Adds the columns the onboarding wizard collects.
-- Safe to re-run (uses "if not exists").
-- =============================================

alter table employees add column if not exists first_name text;
alter table employees add column if not exists last_name  text;
alter table employees add column if not exists phone      text;
alter table employees add column if not exists email      text;
alter table employees add column if not exists pay_rate   numeric default 0;

-- role and pin already exist from the original schema.
-- (role values used by the app: 'admin', 'manager', 'tech')
