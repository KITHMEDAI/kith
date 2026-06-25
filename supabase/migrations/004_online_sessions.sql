-- ============================================================
-- Online session recording via Recall.ai meeting-bot
-- ============================================================
-- Doctors keep using Teams / Google Meet. A bot joins the call (from the
-- meeting link Kith already syncs off Google Calendar), records both sides,
-- and on completion the transcript flows into the SAME note pipeline as
-- in-person sessions.

-- The meeting join link, captured during Google Calendar sync OR entered
-- manually when booking a video appointment.
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meeting_url TEXT;

-- Links an appointment to the session it produced (written by both the in-person
-- start route and the online bot route; was previously failing silently).
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;

-- How this session was recorded: local mic (in-person) or a Recall bot (online).
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS recording_source TEXT
  NOT NULL DEFAULT 'in_person'
  CHECK (recording_source IN ('in_person', 'online_bot'));

-- The Recall bot id, used to correlate incoming webhooks back to a session.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS recall_bot_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sessions_recall_bot ON sessions(recall_bot_id);
