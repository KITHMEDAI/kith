-- Semantic + keyword ("hybrid") search over session notes.
--
-- Notes previously had no real search — the /notes page fetched up to 100
-- rows and did an in-JS substring match over patient name + session_summary
-- only. This adds:
--   1. pgvector, for semantic similarity search over the full note content
--      (soap_note + summary + key_points + homework + manual_notes).
--   2. A generated tsvector column, for exact-keyword matching (a clinician
--      searching their own phrasing should still find it even where the
--      embedding's nearest neighbours miss it).
--   3. A single RPC that blends both into one ranked result set, scoped to
--      the calling therapist and to completed sessions only.
--
-- Embeddings are written by lib/embeddings.ts (Voyage AI in production; a
-- deterministic local mock until VOYAGE_API_KEY is set — see that file).
-- No ANN index (HNSW/IVFFlat) yet: a brute-force scan over a few thousand
-- rows per therapist is comfortably fast, and this is a solo/small-practice
-- tool, not a bulk-scale one. Add an index later if a therapist's session
-- count ever makes that necessary.

CREATE EXTENSION IF NOT EXISTS "vector";

ALTER TABLE sessions
  ADD COLUMN embedding    vector(1024),
  ADD COLUMN search_text  TEXT;

-- Generated from search_text (the same composed text the embedding is built
-- from), so the two are always in sync from a single write.
ALTER TABLE sessions
  ADD COLUMN notes_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(search_text, ''))) STORED;

CREATE INDEX idx_sessions_notes_tsv ON sessions USING gin(notes_tsv);

-- Hybrid ranked search, scoped to one therapist (and optionally one
-- patient). Blends normalised vector similarity (60%) with keyword rank
-- (40%) — a naive linear blend, easy to retune once there's real usage to
-- learn from. Only considers sessions that have actually been embedded
-- (embedding IS NOT NULL implies notes exist and were processed).
CREATE OR REPLACE FUNCTION search_session_notes(
  p_therapist_id    UUID,
  p_query_embedding vector(1024),
  p_query_text      TEXT,
  p_patient_id      UUID DEFAULT NULL,
  p_limit           INT  DEFAULT 100
)
RETURNS TABLE (id UUID, score FLOAT)
LANGUAGE sql STABLE
AS $$
  SELECT
    s.id,
    (
      COALESCE(1 - (s.embedding <=> p_query_embedding), 0) * 0.6
      + COALESCE(ts_rank(s.notes_tsv, plainto_tsquery('english', p_query_text)), 0) * 0.4
    ) AS score
  FROM sessions s
  WHERE s.therapist_id = p_therapist_id
    AND s.status = 'completed'
    AND s.embedding IS NOT NULL
    AND (p_patient_id IS NULL OR s.patient_id = p_patient_id)
  ORDER BY score DESC
  LIMIT p_limit;
$$;
