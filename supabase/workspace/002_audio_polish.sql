-- Kith Workspace: "polish pass" — after a recording stops, the browser uploads
-- the audio to a PRIVATE bucket via a one-time signed upload URL; the server
-- re-transcribes the whole file (more accurate than live, better speakers),
-- then deletes the audio. These columns track that per note.
-- Sydney project only.

ALTER TABLE ws_notes ADD COLUMN IF NOT EXISTS audio_paths TEXT[] DEFAULT '{}';     -- "<track>:<storage path>", removed after processing
ALTER TABLE ws_notes ADD COLUMN IF NOT EXISTS transcript_source TEXT;              -- 'live' | 'polished' (recorded notes only)

-- Private bucket (no public access, no client policies: uploads use signed
-- upload URLs issued by the server; reads only via service role).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ws-audio', 'ws-audio', false, 209715200, ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
