-- Cancelling a subscription previously set subscription_status = 'cancelled'
-- immediately, even though Razorpay is told to cancel at the END of the
-- current billing cycle — the doctor already paid for that cycle, and
-- getEntitlements() treats any non-'active' status as Free tier, so they
-- lost paid features the instant they clicked Cancel. This directly
-- contradicted the UI's own promise ("you keep full access until the
-- billing cycle ends") and Razorpay's own cancel-at-cycle-end setting.
--
-- cancel_at stores when access should actually lapse. subscription_status
-- stays 'active' through the paid-through period; getEntitlements() now
-- checks cancel_at directly, so access lapses on time even if the Razorpay
-- webhook that would otherwise flip the status never fires (a known gap —
-- RAZORPAY_WEBHOOK_SECRET is currently unset in production).
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS cancel_at TIMESTAMPTZ;

-- Same protection as the other billing columns (008_protect_billing_columns.sql)
-- — must not be client-writable, or a doctor could clear their own cancel_at
-- to keep paid access forever after cancelling.
CREATE OR REPLACE FUNCTION protect_billing_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.subscription_plan := OLD.subscription_plan;
    NEW.subscription_status := OLD.subscription_status;
    NEW.billing_interval := OLD.billing_interval;
    NEW.trial_ends_at := OLD.trial_ends_at;
    NEW.razorpay_customer_id := OLD.razorpay_customer_id;
    NEW.razorpay_subscription_id := OLD.razorpay_subscription_id;
    NEW.cancel_at := OLD.cancel_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
