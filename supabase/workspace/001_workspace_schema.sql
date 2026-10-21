-- Kith Workspace (generic edition) — fresh schema for the SYDNEY Supabase
-- project only. Never run this against the kith.space (therapist) database.
--
-- Deliberately tiny: a profile per user, their notes, and the edits they make
-- to generated notes (used as style examples for future notes).

CREATE EXTENSION IF NOT EXISTS "vector";

-- ── Profiles ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ws_profiles (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL,
  phone             TEXT,
  field             TEXT NOT NULL DEFAULT 'general',   -- key from lib/workspace/fields.ts, or 'other'
  field_custom      TEXT,                              -- free text when field = 'other'
  field_profile     TEXT,                              -- AI-written profile for custom fields
  note_preferences  TEXT,                              -- "how I like my notes" (optional)
  default_note_type TEXT,                              -- last/preferred note type key
  recording_consent_ack_at TIMESTAMPTZ,                -- ticked "everyone recorded has agreed"
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Notes ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ws_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT,
  note_type     TEXT NOT NULL DEFAULT 'general',
  custom_instruction TEXT,       -- user's description when note_type = 'custom'
  field         TEXT NOT NULL DEFAULT 'general',
  input_mode    TEXT NOT NULL DEFAULT 'typed' CHECK (input_mode IN ('typed', 'recorded')),
  input_enc     TEXT,            -- encrypted transcript or typed text (lib/encryption.ts)
  duration_seconds INTEGER,
  status        TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  content       JSONB,           -- { summary, sections[], action_items[], decisions[], follow_ups[], flags[], tags[] }
  summary       TEXT,
  error         TEXT,
  embedding     vector(1024),
  search_text   TEXT,
  search_tsv    tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(search_text, ''))) STORED,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ws_notes_user_created ON ws_notes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ws_notes_tsv ON ws_notes USING gin (search_tsv);

-- ── Edits (style learning) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ws_note_edits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id     UUID NOT NULL REFERENCES ws_notes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_type   TEXT NOT NULL,
  before_text TEXT NOT NULL,
  after_text  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ws_note_edits_user ON ws_note_edits (user_id, created_at DESC);

-- ── Row-level security: every row belongs to exactly one user ─────────────
ALTER TABLE ws_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ws_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ws_note_edits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ws_profiles_own ON ws_profiles;
CREATE POLICY ws_profiles_own ON ws_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ws_notes_own ON ws_notes;
CREATE POLICY ws_notes_own ON ws_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ws_note_edits_own ON ws_note_edits;
CREATE POLICY ws_note_edits_own ON ws_note_edits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Hybrid search (semantic 60% + keyword 40%), scoped to one user ────────
CREATE OR REPLACE FUNCTION ws_search_notes(
  p_user_id         UUID,
  p_query_embedding vector(1024),
  p_query_text      TEXT,
  p_limit           INT DEFAULT 20
)
RETURNS TABLE (id UUID, score FLOAT)
LANGUAGE sql STABLE
AS $$
  SELECT n.id,
    (
      COALESCE(1 - (n.embedding <=> p_query_embedding), 0) * 0.6
      + COALESCE(ts_rank(n.search_tsv, websearch_to_tsquery('english', p_query_text)), 0) * 0.4
    ) AS score
  FROM ws_notes n
  WHERE n.user_id = p_user_id
    AND n.status = 'completed'
  ORDER BY score DESC
  LIMIT p_limit;
$$;

-- Keyword-only fallback (used when the embedding provider is slow/unavailable).
CREATE OR REPLACE FUNCTION ws_keyword_notes(
  p_user_id    UUID,
  p_query_text TEXT,
  p_limit      INT DEFAULT 20
)
RETURNS TABLE (id UUID, score FLOAT)
LANGUAGE sql STABLE
AS $$
  SELECT n.id, ts_rank(n.search_tsv, websearch_to_tsquery('english', p_query_text))::float AS score
  FROM ws_notes n
  WHERE n.user_id = p_user_id
    AND n.status = 'completed'
    AND n.search_tsv @@ websearch_to_tsquery('english', p_query_text)
  ORDER BY score DESC
  LIMIT p_limit;
$$;
