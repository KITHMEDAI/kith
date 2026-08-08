/**
 * scripts/backfill-note-embeddings.ts
 *
 * One-time backfill: embeds every completed session's note content that
 * predates the search feature (migration 016_notes_semantic_search.sql).
 * New sessions are embedded automatically on generation/edit — see
 * lib/embeddings.ts's embedAndStoreNote, called from lib/process-notes.ts
 * and app/api/sessions/[id]/route.ts.
 *
 * Safe to re-run — by default only targets rows where embedding IS NULL.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill-note-embeddings.ts
 *
 * Pass --force to re-embed EVERY completed session regardless of whether it
 * already has an embedding — needed exactly once, the day VOYAGE_API_KEY is
 * first set for real: rows backfilled earlier in mock mode already have a
 * non-null (but fake) embedding, so the default NULL-only filter would
 * silently skip re-embedding them with real vectors.
 *   npx tsx --env-file=.env.local scripts/backfill-note-embeddings.ts --force
 */
import { createServiceRoleClient } from '@/lib/supabase/server';
import { embedAndStoreNote, EMBEDDINGS_MOCK } from '@/lib/embeddings';

async function main() {
  const force = process.argv.includes('--force');

  if (EMBEDDINGS_MOCK) {
    console.log('[backfill] VOYAGE_API_KEY not set — writing local mock embeddings, not real ones.\n');
  } else if (force) {
    console.log('[backfill] --force: re-embedding ALL completed sessions with real Voyage vectors, including ones already mock-embedded.\n');
  }

  const service = createServiceRoleClient();
  let query = service
    .from('sessions')
    .select('id')
    .eq('status', 'completed')
    .not('soap_note', 'is', null);
  if (!force) query = query.is('embedding', null);
  const { data: sessions, error } = await query;

  if (error) throw new Error(`Failed to list sessions: ${error.message}`);
  if (!sessions || sessions.length === 0) {
    console.log('[backfill] Nothing to do — every completed session already has an embedding.');
    return;
  }

  console.log(`[backfill] Embedding ${sessions.length} session(s)...`);
  let ok = 0;
  let failed = 0;
  for (const s of sessions) {
    try {
      await embedAndStoreNote(s.id, service);
      ok++;
    } catch (err) {
      failed++;
      console.warn(`[backfill] session ${s.id} failed:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[backfill] Done — ${ok} embedded, ${failed} failed.`);
}

main().catch(err => {
  console.error('[backfill] Fatal error:', err);
  process.exit(1);
});
