-- ============================================================
-- Kith — Therapist Extended Profile (run after 001_full_schema.sql)
-- ============================================================

ALTER TABLE therapists
  ADD COLUMN IF NOT EXISTS consultation_fee_inr     INTEGER     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS working_hours            JSONB       DEFAULT '{"monday":{"enabled":true,"start":"09:00","end":"18:00"},"tuesday":{"enabled":true,"start":"09:00","end":"18:00"},"wednesday":{"enabled":true,"start":"09:00","end":"18:00"},"thursday":{"enabled":true,"start":"09:00","end":"18:00"},"friday":{"enabled":true,"start":"09:00","end":"18:00"},"saturday":{"enabled":false,"start":"10:00","end":"14:00"},"sunday":{"enabled":false,"start":"10:00","end":"14:00"}}',
  ADD COLUMN IF NOT EXISTS session_types            TEXT[]      DEFAULT ARRAY['individual'],
  ADD COLUMN IF NOT EXISTS accepts_insurance        BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_source           TEXT        DEFAULT 'phone',
  ADD COLUMN IF NOT EXISTS booking_url              TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS patient_records_source   TEXT        DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS onboarding_step          TEXT        DEFAULT 'identity';

-- Sessions: columns referenced by end/process-notes routes
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS notes_generated_at       TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS manual_notes             TEXT        DEFAULT NULL;

-- ============================================================
-- PATIENT METRICS — mood, standardised scores, homework tracking
-- One row per session. Queried by growth charts.
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_metrics (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id               UUID REFERENCES patients(id)   ON DELETE CASCADE NOT NULL,
  therapist_id             UUID REFERENCES therapists(id) ON DELETE CASCADE NOT NULL,
  session_id               UUID REFERENCES sessions(id)   ON DELETE SET NULL,
  mood_score               INTEGER  CHECK (mood_score BETWEEN 1 AND 10),
  gad7_score               INTEGER  CHECK (gad7_score BETWEEN 0 AND 21),
  phq9_score               INTEGER  CHECK (phq9_score BETWEEN 0 AND 27),
  homework_completed       BOOLEAN,
  session_duration_minutes INTEGER,
  recorded_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_metrics_patient  ON patient_metrics(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_metrics_recorded ON patient_metrics(recorded_at);

-- RLS
ALTER TABLE patient_metrics ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patient_metrics' AND policyname = 'metrics_own'
  ) THEN
    CREATE POLICY "metrics_own" ON patient_metrics
      FOR ALL USING (therapist_id IN (SELECT id FROM therapists WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Google Calendar tokens stored directly on the therapist row
-- (Vault can be enabled later for production hardening)
ALTER TABLE therapists
  ADD COLUMN IF NOT EXISTS google_calendar_tokens JSONB DEFAULT NULL;
