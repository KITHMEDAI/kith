-- ============================================================
-- Kith — Billing tiers v1 (run in Supabase SQL editor)
-- Adds a real Free tier (the floor everyone falls back to instead of being
-- locked out) and a billing_interval column for monthly/annual subscriptions.
-- ============================================================

-- Allow 'free' alongside the existing starter/pro/clinic values.
ALTER TABLE therapists DROP CONSTRAINT IF EXISTS therapists_subscription_plan_check;
ALTER TABLE therapists ADD CONSTRAINT therapists_subscription_plan_check
  CHECK (subscription_plan IN ('free','starter','pro','clinic'));

-- New sign-ups land on Free once their trial ends — not locked out.
ALTER TABLE therapists ALTER COLUMN subscription_plan SET DEFAULT 'free';

-- Monthly vs annual billing (annual = 2 months free, set at checkout).
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS billing_interval TEXT
  DEFAULT 'monthly' CHECK (billing_interval IN ('monthly','annual'));
