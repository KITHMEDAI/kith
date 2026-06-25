-- ============================================================
-- Kith — Full Database Schema (canonical, matches app types)
-- Run in Supabase SQL editor: Dashboard → SQL Editor → New query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- THERAPISTS
-- ============================================================
CREATE TABLE therapists (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name                 TEXT NOT NULL,
  email                        TEXT NOT NULL UNIQUE,
  phone                        TEXT,
  avatar_url                   TEXT,
  designation                  TEXT,                             -- e.g. "Clinical Psychologist"
  license_number               TEXT,
  license_council              TEXT DEFAULT 'RCI',              -- RCI / MCI / IPS / Other
  bio                          TEXT,
  specializations              TEXT[] DEFAULT '{}',
  clinic_name                  TEXT,
  clinic_address               TEXT,
  timezone                     TEXT DEFAULT 'Asia/Kolkata',
  languages_spoken             TEXT[] DEFAULT ARRAY['English'],
  default_session_duration     INTEGER DEFAULT 50,
  subscription_plan            TEXT DEFAULT 'starter'
                                 CHECK (subscription_plan IN ('starter','pro','clinic')),
  subscription_status          TEXT DEFAULT 'trialing'
                                 CHECK (subscription_status IN ('trialing','active','past_due','cancelled')),
  trial_ends_at                TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  razorpay_customer_id         TEXT,
  razorpay_subscription_id     TEXT,
  google_calendar_vault_secret_id TEXT,                         -- encrypted via Supabase Vault
  onboarding_completed         BOOLEAN DEFAULT false,
  created_at                   TIMESTAMPTZ DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TYPE patient_status   AS ENUM ('active','inactive','discharged','on_hold');
CREATE TYPE risk_level_enum  AS ENUM ('low','moderate','high','critical');

CREATE TABLE patients (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id           UUID REFERENCES therapists(id) ON DELETE CASCADE NOT NULL,
  display_name           TEXT NOT NULL,
  date_of_birth          DATE,
  age                    INTEGER,
  gender                 TEXT CHECK (gender IN ('male','female','non_binary','prefer_not_to_say','other')),
  phone                  TEXT,
  whatsapp_number        TEXT,
  email                  TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  patient_id_number      TEXT,
  diagnosis              TEXT[] DEFAULT '{}',
  icd_codes              TEXT[] DEFAULT '{}',
  therapy_modality       TEXT,                                  -- CBT / EMDR / DBT / ERP / etc.
  therapy_goals          TEXT[] DEFAULT '{}',
  presenting_concerns    TEXT,
  medications            TEXT,
  risk_level             risk_level_enum DEFAULT 'low',
  status                 patient_status DEFAULT 'active',
  total_sessions         INTEGER DEFAULT 0,
  last_session_date      DATE,
  session_frequency      TEXT DEFAULT 'weekly'
                           CHECK (session_frequency IN ('weekly','biweekly','monthly','as_needed')),
  session_duration_minutes INTEGER DEFAULT 50,
  fee_per_session        DECIMAL(10,2),
  consent_recording      BOOLEAN DEFAULT false,
  consent_ai_notes       BOOLEAN DEFAULT false,
  consent_date           TIMESTAMPTZ,
  discharge_date         DATE,
  discharge_summary      TEXT,
  imported_from          TEXT,
  import_batch_id        UUID,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id     UUID REFERENCES therapists(id) ON DELETE CASCADE NOT NULL,
  patient_id       UUID REFERENCES patients(id) ON DELETE SET NULL,
  scheduled_at     TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 50,
  session_type     TEXT DEFAULT 'individual'
                     CHECK (session_type IN ('individual','couples','family','group')),
  modality         TEXT DEFAULT 'in_person'
                     CHECK (modality IN ('in_person','video','phone')),
  status           TEXT DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled','confirmed','in_session','completed','cancelled','no_show')),
  notes            TEXT,
  google_event_id  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SESSIONS (live recordings)
-- ============================================================
CREATE TABLE sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id          UUID REFERENCES therapists(id) ON DELETE CASCADE NOT NULL,
  patient_id            UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id        UUID REFERENCES appointments(id) ON DELETE SET NULL,
  session_number        INTEGER DEFAULT 1,
  started_at            TIMESTAMPTZ DEFAULT NOW(),
  ended_at              TIMESTAMPTZ,
  duration_seconds      INTEGER,
  status                TEXT DEFAULT 'active'
                          CHECK (status IN ('active','processing','completed','failed')),
  transcript_raw        JSONB DEFAULT '[]',                   -- AssemblyAI segments
  transcript_compressed TEXT,                                 -- Haiku-compressed brief
  soap_note             JSONB,                                -- {subjective,objective,assessment,plan}
  dap_note              JSONB,
  key_points            TEXT[] DEFAULT '{}',
  session_summary       TEXT,
  session_growth        JSONB,                                -- {compared_to_last,areas_of_progress,...}
  ai_suggestions        TEXT[] DEFAULT '{}',
  prescription_notes    JSONB,
  risk_level            risk_level_enum DEFAULT 'low',
  risk_flags            JSONB,
  homework_assigned     TEXT,
  next_session_plan     TEXT,
  session_tags          TEXT[] DEFAULT '{}',
  resource_suggestions  JSONB,
  manual_notes          TEXT,
  assemblyai_id         TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE therapists   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions     ENABLE ROW LEVEL SECURITY;

-- Therapists: own row only
CREATE POLICY "therapists_self" ON therapists
  FOR ALL USING (auth.uid() = user_id);

-- Patients: therapist sees their own patients
CREATE POLICY "patients_own" ON patients
  FOR ALL USING (
    therapist_id IN (SELECT id FROM therapists WHERE user_id = auth.uid())
  );

-- Appointments: therapist sees their own
CREATE POLICY "appointments_own" ON appointments
  FOR ALL USING (
    therapist_id IN (SELECT id FROM therapists WHERE user_id = auth.uid())
  );

-- Sessions: therapist sees their own
CREATE POLICY "sessions_own" ON sessions
  FOR ALL USING (
    therapist_id IN (SELECT id FROM therapists WHERE user_id = auth.uid())
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_patients_therapist     ON patients(therapist_id);
CREATE INDEX idx_patients_status        ON patients(status);
CREATE INDEX idx_appointments_therapist ON appointments(therapist_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_sessions_therapist     ON sessions(therapist_id);
CREATE INDEX idx_sessions_patient       ON sessions(patient_id);
CREATE INDEX idx_sessions_status        ON sessions(status);

-- Full-text search on patients
CREATE INDEX idx_patients_name_fts ON patients
  USING gin(to_tsvector('english', display_name));

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER therapists_updated_at   BEFORE UPDATE ON therapists   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER patients_updated_at     BEFORE UPDATE ON patients     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sessions_updated_at     BEFORE UPDATE ON sessions     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
