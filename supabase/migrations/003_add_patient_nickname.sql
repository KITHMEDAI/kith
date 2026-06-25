-- Adds the optional "preferred name" column the importer already maps to.
-- Until this runs, imports still succeed — the schema-aware writer in
-- lib/patient-match.ts drops `nickname` when the column is absent. Once the
-- column exists, the same writer persists it automatically (no code change).
ALTER TABLE patients ADD COLUMN IF NOT EXISTS nickname TEXT;
