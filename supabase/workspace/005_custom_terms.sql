-- Kith Workspace: per-user "names & terms" (2026-10-25). SYDNEY project only.
-- Words the user adds on their profile (clients', places' and colleagues'
-- names, local brands) are boosted in transcription (Deepgram keyterms, live
-- and polish pass) and given to the note writer as a spelling reference.
-- Stored encrypted by the app (lib/workspace/crypto.ts seal), max 40 terms.
-- Run BEFORE deploying the matching code: the profile save and the data
-- export read and write this column.

ALTER TABLE ws_profiles ADD COLUMN IF NOT EXISTS custom_terms TEXT;   -- encrypted (crypto.ts seal)

-- Check (expect: one row)
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ws_profiles' AND column_name = 'custom_terms';
