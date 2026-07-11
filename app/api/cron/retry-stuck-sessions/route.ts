/**
 * GET /api/cron/retry-stuck-sessions
 *
 * Backstop for sessions stuck at status "processing" — the therapist sees
 * "Generating notes..." indefinitely with no way out except noticing and
 * manually hitting retry-notes. This should be rare now that every trigger
 * site uses waitUntil() (see lib/process-notes.ts) instead of a
 * fire-and-forget fetch, but a hard platform kill or an Anthropic outage that
 * outlasts the function's maxDuration can still leave a row stranded.
 *
 * Two cases, two thresholds:
 *   - Has a transcript already (note generation itself stalled) — this
 *     normally takes ~60-90s, so >10 min stuck means the attempt was almost
 *     certainly dropped or crashed silently. Re-run it.
 *   - No transcript yet (online session still waiting on Recall's
 *     transcript.done webhook) — that can legitimately take a while, so give
 *     it 45 min before giving up and marking the session failed instead of
 *     leaving the therapist staring at a spinner forever.
 *
 * Protected by CRON_SECRET when set — Vercel Cron sends it as a Bearer token.
 */
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runNoteGeneration } from '@/lib/process-notes';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const NOTE_GEN_STUCK_MINUTES = 10;
const AWAITING_TRANSCRIPT_STUCK_MINUTES = 45;
const MAX_PER_RUN = 5; // keep one cron invocation bounded

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceRoleClient();
  const earliestCutoff = new Date(Date.now() - NOTE_GEN_STUCK_MINUTES * 60_000).toISOString();

  const { data: candidates, error } = await service
    .from('sessions')
    .select('id, transcript_raw, updated_at')
    .eq('status', 'processing')
    .lt('updated_at', earliestCutoff)
    .limit(MAX_PER_RUN);

  if (error) {
    console.error('[Kith] retry-stuck-sessions query failed:', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let retried = 0;
  let failed = 0;
  let skipped = 0;
  const now = Date.now();

  for (const s of candidates ?? []) {
    const hasTranscript = Array.isArray(s.transcript_raw) && s.transcript_raw.length > 0;
    const stuckMinutes = (now - new Date(s.updated_at as string).getTime()) / 60_000;

    if (!hasTranscript) {
      if (stuckMinutes < AWAITING_TRANSCRIPT_STUCK_MINUTES) { skipped++; continue; }
      console.warn(`[Kith] retry-stuck-sessions: session ${s.id} never got a transcript after ${Math.round(stuckMinutes)} min — marking failed`);
      await service.from('sessions').update({ status: 'failed' }).eq('id', s.id);
      failed++;
      continue;
    }

    console.warn(`[Kith] retry-stuck-sessions: re-running note generation for session ${s.id} (stuck "processing" ${Math.round(stuckMinutes)} min)`);
    await runNoteGeneration(s.id).catch(err => {
      console.error(`[Kith] retry-stuck-sessions: session ${s.id} retry failed:`, err);
    });
    retried++;
  }

  return NextResponse.json({ ok: true, checked: candidates?.length ?? 0, retried, failed, skipped });
}
