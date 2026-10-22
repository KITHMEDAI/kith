-- Kith Workspace: security hardening (audit 2026-10-22). SYDNEY project only.
--
-- 1. Clients (anon key + user JWT) may only READ their rows and DELETE their
--    notes. Every write goes through the API, which validates input and uses
--    the service role. Stops users writing server-owned columns directly via
--    PostgREST (status, audio_paths, input_enc, field_profile, …).
-- 2. Search functions only answer for the caller (or the service role).
-- 3. Persistent rate limits / budgets shared by every serverless instance.
-- 4. Retry counter, terms acceptance, smaller audio cap.

-- ── 1. Table privileges ────────────────────────────────────────────────────
REVOKE ALL ON ws_profiles, ws_notes, ws_note_edits FROM anon, authenticated;
GRANT SELECT ON ws_profiles, ws_notes, ws_note_edits TO authenticated;
GRANT DELETE ON ws_notes TO authenticated;
-- (RLS policies stay as they are: every row still only visible to its owner.)

-- ── 2. Search functions: caller-scoped, fixed search_path ──────────────────
CREATE OR REPLACE FUNCTION ws_search_notes(
  p_user_id         UUID,
  p_query_embedding vector(1024),
  p_query_text      TEXT,
  p_limit           INT DEFAULT 20
)
RETURNS TABLE (id UUID, score FLOAT)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT n.id,
    (
      COALESCE(1 - (n.embedding <=> p_query_embedding), 0) * 0.6
      + COALESCE(ts_rank(n.search_tsv, websearch_to_tsquery('english', p_query_text)), 0) * 0.4
    ) AS score
  FROM ws_notes n
  WHERE n.user_id = p_user_id
    AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
    AND n.status = 'completed'
  ORDER BY score DESC
  LIMIT LEAST(p_limit, 100);
$$;

CREATE OR REPLACE FUNCTION ws_keyword_notes(
  p_user_id    UUID,
  p_query_text TEXT,
  p_limit      INT DEFAULT 20
)
RETURNS TABLE (id UUID, score FLOAT)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT n.id, ts_rank(n.search_tsv, websearch_to_tsquery('english', p_query_text))::float AS score
  FROM ws_notes n
  WHERE n.user_id = p_user_id
    AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
    AND n.status = 'completed'
    AND n.search_tsv @@ websearch_to_tsquery('english', p_query_text)
  ORDER BY score DESC
  LIMIT LEAST(p_limit, 100);
$$;

REVOKE ALL ON FUNCTION ws_search_notes(UUID, vector, TEXT, INT) FROM public, anon;
REVOKE ALL ON FUNCTION ws_keyword_notes(UUID, TEXT, INT) FROM public, anon;
GRANT EXECUTE ON FUNCTION ws_search_notes(UUID, vector, TEXT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ws_keyword_notes(UUID, TEXT, INT) TO authenticated, service_role;

-- ── 3. Persistent rate limits (fixed window, server-only) ─────────────────
CREATE TABLE IF NOT EXISTS ws_rate_limits (
  key          TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER NOT NULL
);
ALTER TABLE ws_rate_limits ENABLE ROW LEVEL SECURITY;   -- no policies: clients can't touch it
REVOKE ALL ON ws_rate_limits FROM anon, authenticated;

-- Adds p_cost to the key's counter. Returns 0 when allowed, otherwise the
-- seconds until the window resets (the hit is still counted).
CREATE OR REPLACE FUNCTION ws_rate_hit(p_key TEXT, p_max INT, p_window_seconds INT, p_cost INT DEFAULT 1)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r ws_rate_limits%ROWTYPE;
  win INTERVAL := make_interval(secs => p_window_seconds);
BEGIN
  INSERT INTO ws_rate_limits AS t (key, window_start, count)
  VALUES (p_key, now(), p_cost)
  ON CONFLICT (key) DO UPDATE SET
    window_start = CASE WHEN t.window_start < now() - win THEN now() ELSE t.window_start END,
    count        = CASE WHEN t.window_start < now() - win THEN p_cost ELSE t.count + p_cost END
  RETURNING * INTO r;
  IF r.count > p_max THEN
    RETURN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (r.window_start + win - now())))::INT);
  END IF;
  RETURN 0;
END
$$;
REVOKE ALL ON FUNCTION ws_rate_hit(TEXT, INT, INT, INT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION ws_rate_hit(TEXT, INT, INT, INT) TO service_role;

-- ── 4. Misc columns + audio cap ───────────────────────────────────────────
ALTER TABLE ws_notes    ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ws_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- 50 MB per file (~3.5 h at the recorder's 32 kbps).
UPDATE storage.buckets SET file_size_limit = 52428800 WHERE id = 'ws-audio';

-- ── Check: there must be NO client policies on the audio bucket ───────────
-- (expect zero rows mentioning ws-audio)
SELECT policyname, cmd, roles, qual FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';
