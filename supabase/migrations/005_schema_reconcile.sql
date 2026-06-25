-- ============================================================
-- Kith — Schema reconcile (run in Supabase SQL editor)
-- Adds columns the application code already reads/writes but that
-- were never created in 001/002. Each is a separate source of the
-- "Could not find the 'X' column ... in the schema cache" class of
-- bug that silently breaks a whole flow.
--
-- Safe to run multiple times (IF NOT EXISTS on every statement).
-- ============================================================

-- 1. sessions.patient_mood_score
--    Written by /api/sessions/process-notes (notes pipeline) and
--    /api/webhooks/deepgram; read by the patient detail page, note
--    detail page, /api/sessions/[id] and the PDF export. AI returns
--    a 1-10 mood estimate. Missing column => process-notes 500 and
--    the patient page's session SELECT fails.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS patient_mood_score INTEGER;

-- 2. appointments.goals
--    Written by POST /api/appointments (BookingDialog "session goals").
--    Without it, any booking that includes goals returns 500.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS goals TEXT;

-- 3. patients.nickname  (was migration 003 — folded in here so the
--    schema is reconciled in one place). Import maps a "Nickname"
--    column to this; the schema-aware writer drops it until present.
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS nickname TEXT;
