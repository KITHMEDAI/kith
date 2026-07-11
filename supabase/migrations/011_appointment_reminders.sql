-- ============================================================
-- Kith — Appointment reminder tracking (run in Supabase SQL editor)
-- Lets the reminder cron dedupe: without this, re-running the job (or a
-- retry) would re-email the patient every time it fires within the window.
-- ============================================================

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
