-- SECURITY FIX: "sessions_own" (001_full_schema.sql) is `FOR ALL USING (...)`,
-- meaning any doctor's own client-side Supabase SDK can INSERT/UPDATE/DELETE
-- session rows directly, bypassing /api/sessions/start's monthly-cap check
-- entirely (a free-tier user could insert rows directly, or delete old ones,
-- to stay under the cap forever). Combined with the missing auth check that
-- used to exist on /api/sessions/resume (fixed separately), this allowed
-- unlimited real transcription sessions regardless of plan.
--
-- Every legitimate write to `sessions` already goes through server routes
-- using the service-role client (start/end/bot/resume/process-notes/etc,
-- verified via code audit 2026-07) — service_role bypasses RLS regardless of
-- policy, so removing write access for the `authenticated` role here breaks
-- nothing real, it only closes the direct-client-SDK bypass.
DROP POLICY IF EXISTS "sessions_own" ON sessions;

CREATE POLICY "sessions_select_own" ON sessions
  FOR SELECT USING (
    therapist_id IN (SELECT id FROM therapists WHERE user_id = auth.uid())
  );
