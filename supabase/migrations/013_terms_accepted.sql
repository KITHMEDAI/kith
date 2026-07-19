-- The signup form's Terms/Privacy checkbox (register/page.tsx consentChecked)
-- gated the "Continue" button client-side, but was never sent to or recorded
-- by the server — app/api/auth/register/route.ts had no way to know consent
-- was actually given, and a direct call to the API bypassed the checkbox
-- entirely. terms_accepted_at records the real acceptance, server-side.
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
