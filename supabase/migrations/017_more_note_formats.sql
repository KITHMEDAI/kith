-- Adds DAP and BIRP as selectable note-generation formats, alongside the
-- existing SOAP (default) and EMDR — see lib/note-fields.ts for the field
-- registry and lib/claude.ts's NOTE_SCHEMAS for the generation prompts.
-- Same storage model as EMDR: all four formats are stored as-is in the
-- existing `sessions.soap_note` JSONB column; consumers detect which shape
-- a given note is by checking for a field name unique to that format.
--
-- Looks up the actual CHECK constraint on therapists.note_format by
-- inspecting the catalog rather than assuming Postgres's default
-- auto-generated name (015_note_format.sql added it inline via ADD COLUMN
-- ... CHECK (...), so the name is very likely the default
-- "therapists_note_format_check", but guessing wrong here would silently
-- leave the old, more restrictive constraint in place alongside a new one
-- — the app would think dap/birp are allowed while the DB still rejects
-- them. This is the same risk with none of the guessing.
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'therapists'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%note_format%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE therapists DROP CONSTRAINT %I', constraint_name);
  END IF;

  ALTER TABLE therapists ADD CONSTRAINT therapists_note_format_check
    CHECK (note_format IN ('soap', 'emdr', 'dap', 'birp'));
END $$;
