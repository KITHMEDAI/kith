-- Backs the marketing outreach agent's opt-in capture + nurture sequence.
-- This table holds Kith's own marketing prospects (people who requested a
-- lead magnet like the free SOAP note templates), NOT therapist patient
-- data — no per-therapist scoping needed. RLS is enabled with zero
-- policies so anon/authenticated clients get nothing; only the
-- service-role key (used server-side in /api/leads/* and the nurture
-- cron) can read or write this table.
CREATE TABLE IF NOT EXISTS leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL UNIQUE,
  source            TEXT NOT NULL,           -- which lead magnet/entry point, e.g. 'guide-soap-templates'
  region            TEXT,                    -- optional, self-reported or inferred
  nurture_step      INT NOT NULL DEFAULT 0,  -- how many nurture emails already sent
  nurture_next_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_nurture_due ON leads (nurture_next_at) WHERE unsubscribed_at IS NULL;

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
