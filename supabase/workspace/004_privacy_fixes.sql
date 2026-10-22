-- Kith Workspace: "fix soon" privacy items (audit 2026-10-22). SYDNEY project only.
-- Safe to run before the matching code is deployed: it only adds columns and
-- drops the edit-history table, whose reads/writes the old code already
-- treats as optional.
--
-- #11 Note text is encrypted by the app (lib/workspace/crypto.ts): title,
--     summary, content (stored as an encrypted JSON string in the JSONB
--     column), custom_instruction, and search_text becomes a blind index of
--     keyed word hashes. No schema change needed; existing rows are converted
--     by scripts/workspace-test/encrypt-backfill.ts after the deploy.
-- #13 Per-recording consent, stored on the note and required by the API.
-- #14 Raw before/after edit text is no longer kept or reused in prompts for
--     other clients' notes. A short, generic, encrypted style summary on the
--     profile replaces it.

ALTER TABLE ws_notes    ADD COLUMN IF NOT EXISTS recording_consent_at TIMESTAMPTZ;
ALTER TABLE ws_profiles ADD COLUMN IF NOT EXISTS style_notes TEXT;   -- encrypted (crypto.ts seal)

DROP TABLE IF EXISTS ws_note_edits;

-- Check (expect: both columns listed, ws_note_edits gone)
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'ws_notes' AND column_name = 'recording_consent_at')
    OR (table_name = 'ws_profiles' AND column_name = 'style_notes')
    OR table_name = 'ws_note_edits');
