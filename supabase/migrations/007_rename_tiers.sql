-- Rename paid tiers: 'starter' -> 'pro', old 'pro' -> 'ultra'. New pricing:
-- Pro $20/mo, Ultra $50/mo (charged as INR equivalent via Razorpay). No live
-- subscribers exist yet (Razorpay was never wired into production), but
-- migrate any existing dev/test rows in the safe order (old 'pro' out of the
-- way first) before repointing the CHECK constraint.
UPDATE therapists SET subscription_plan = 'ultra' WHERE subscription_plan = 'pro';
UPDATE therapists SET subscription_plan = 'pro' WHERE subscription_plan = 'starter';

ALTER TABLE therapists DROP CONSTRAINT IF EXISTS therapists_subscription_plan_check;
ALTER TABLE therapists ADD CONSTRAINT therapists_subscription_plan_check
  CHECK (subscription_plan IN ('free','pro','ultra','clinic'));
