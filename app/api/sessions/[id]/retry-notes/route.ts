/**
 * POST /api/sessions/[id]/retry-notes
 *
 * Re-runs note generation on a session whose notes previously failed (or got
 * stuck). The transcript is already saved on the session row, so we just reset
 * status → 'processing' and fire-and-forget the background processor again.
 */
import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { runNoteGeneration } from '@/lib/process-notes';

// Note generation now runs inline via waitUntil (see below), not a fetch to
// a separate route — needs the same ceiling process-notes used to have.
export const maxDuration = 300;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const service = createServiceRoleClient();
  const { data: session } = await service
    .from('sessions')
    .select('id, therapist_id, status, transcript_raw, updated_at')
    .eq('id', params.id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.therapist_id !== therapist.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!session.transcript_raw || (Array.isArray(session.transcript_raw) && session.transcript_raw.length === 0)) {
    return NextResponse.json({ error: 'No transcript saved for this session — cannot regenerate.' }, { status: 422 });
  }

  // The client's "stuck" retry button appears after only 180s/360s
  // (components/patients/ProcessingBanner.tsx), but generation now retries up
  // to 3 times on validation failure (lib/claude.ts), each resending the full
  // prior response as conversation context — legitimately can take longer
  // than that. `updated_at` is only touched when status changes (set to
  // 'processing' at start, 'completed'/'failed' at the end) — it stays frozen
  // for the entire duration of a real, still-running generation. If it was
  // set very recently, a second concurrent Claude run is almost certainly
  // about to double up on the one already in flight — refuse instead of
  // silently kicking off a second pipeline (wasted cost, last-writer-wins).
  const RECENTLY_STARTED_MS = 5 * 60 * 1000; // generation worst-case ~4-5 min with retries
  if (session.status === 'processing' && session.updated_at) {
    const sinceUpdate = Date.now() - new Date(session.updated_at as string).getTime();
    if (sinceUpdate < RECENTLY_STARTED_MS) {
      return NextResponse.json(
        { error: 'Note generation is still in progress — please wait a bit longer before retrying.' },
        { status: 409 },
      );
    }
  }

  // Reset to processing so the (idempotent) processor will run — it guards on this state.
  await service.from('sessions').update({ status: 'processing' }).eq('id', params.id);

  waitUntil(
    runNoteGeneration(params.id).catch(err => {
      console.error('[Kith] retry-notes (waitUntil) failed:', err);
    }),
  );

  return NextResponse.json({ ok: true });
}
