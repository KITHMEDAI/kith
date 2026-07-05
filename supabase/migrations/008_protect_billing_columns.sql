-- SECURITY FIX: the "therapists_self" RLS policy (001_full_schema.sql) is
-- `FOR ALL USING (auth.uid() = user_id)` with no column restriction — any
-- signed-in doctor can currently run, from the browser console:
--   supabase.from('therapists').update({ subscription_plan: 'ultra',
--     subscription_status: 'active' }).eq('user_id', <own id>)
-- and grant themselves paid-tier access for free, permanently, with zero
-- server involvement. RLS policies can't restrict individual columns
-- directly, so this uses a BEFORE UPDATE trigger instead: any billing
-- column is silently reverted to its previous value unless the write comes
-- from the service-role connection (our server-only billing routes: verify,
-- webhook, cancel, register). Triggers still run even for service_role
-- (BYPASSRLS skips policy checks, not triggers), so legitimate billing
-- writes are unaffected.
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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_billing_columns_trigger ON therapists;
CREATE TRIGGER protect_billing_columns_trigger
  BEFORE UPDATE ON therapists
  FOR EACH ROW EXECUTE FUNCTION protect_billing_columns();
