/**
 * POST /api/sessions/process-notes
 *
 * Thin HTTP wrapper around lib/process-notes.ts, kept for manual/debug
 * triggering (e.g. `curl` with the internal secret). The real trigger paths
 * (session end, Recall webhook finalize, retry-notes) no longer call this
 * over HTTP — they call `runNoteGeneration()` directly in-process, wrapped
 * in `waitUntil()`, so the work can't be silently dropped by the platform
 * freezing the invoking function before an un-awaited fetch completes.
 *
 * Auth: validated via x-internal-secret header (no user session cookie needed
 * because this runs after the user has already navigated away).
 */
import { NextRequest, NextResponse } from 'next/server';
import { runNoteGeneration } from '@/lib/process-notes';

// Up to 5 minutes — Claude Haiku + Sonnet on a long session can take 60-90 s
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // Internal auth — not a user-facing endpoint
  const secret = req.headers.get('x-internal-secret');
  const expected = process.env.INTERNAL_API_SECRET;
  // Fail closed if the secret isn't configured — no hardcoded fallback that
  // would otherwise become a guessable shared backdoor.
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { sessionId, speakerMap = {}, manualNotes = '' } = body;
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 422 });

  const result = await runNoteGeneration(sessionId, { speakerMap, manualNotes });
  if (!result.ok) return NextResponse.json(result, { status: result.skipped ? 200 : 500 });
  return NextResponse.json({ ok: true, sessionId, riskLevel: result.riskLevel });
}
