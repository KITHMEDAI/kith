-- Lets a therapist choose their note-generation format at signup: generic
-- SOAP (default) or EMDR (target/SUD-VOC/cognitions/phase — the structured,
-- measurement-driven format EMDR-trained therapists actually document in).
-- Only controls what shape generateSessionNotes() asks the model for; the
-- existing `sessions.soap_note` JSONB column stores either shape as-is —
-- consumers detect which one by checking for the `target` key.
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS note_format TEXT DEFAULT 'soap' CHECK (note_format IN ('soap', 'emdr'));
