/**
 * POST /api/sessions/end
 *
 * Fast response (~200 ms), note generation continues in the background:
 *   1. Verify auth
 *   2. Save transcript → mark session "processing"
 *   3. Update appointment status
 *   4. Return { ok, patientId } immediately so the client can navigate away
 *   5. waitUntil(runNoteGeneration(...)) keeps this invocation alive in the
 *      background until note generation finishes, WITHOUT blocking the
 *      response above.
 *
 * Previously step 4/5 was a fire-and-forget `fetch()` to a separate
 * /api/sessions/process-notes route. On Vercel that's not safe — once the
 * response is sent, the function instance can be frozen before the fetch
 * even completes its handshake, silently dropping note generation and
 * leaving the session stuck at "processing" forever. waitUntil() guarantees
 * the promise is allowed to finish (up to maxDuration below).
 */
import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { runNoteGeneration } from '@/lib/process-notes';
import type { TranscriptSegment } from '@/types';

// Was 30s when this route only kicked off a fetch — now the actual Haiku +
// Sonnet pipeline runs inline via waitUntil, so it needs the same ceiling
// process-notes used to have.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const sessionId: string       = body.sessionId || body.session_id;
  const transcript: TranscriptSegment[] = body.transcript || [];
  const manualNotes: string     = body.manualNotes || body.manual_notes || '';
  const speakerMap              = body.speakerMap  || {};

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 422 });

  const service = createServiceRoleClient();
  const now = new Date().toISOString();

  // Verify session exists and belongs to this therapist
  const { data: session } = await service
    .from('sessions')
    .select('id, patient_id, therapist_id, appointment_id')
    .eq('id', sessionId)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.therapist_id !== therapist.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 1. Save transcript + mark processing (fast DB write)
  await service.from('sessions').update({
    status: 'processing',
    ended_at: now,
    transcript_raw: transcript,
    manual_notes: manualNotes || null,
  }).eq('id', sessionId);

  // 2. Mark appointment completed
  const apptId = session.appointment_id as string | null;
  if (apptId) {
    await service.from('appointments').update({ status: 'completed' }).eq('id', apptId);
  }

  // 3. Update patient last_session_date immediately (no need to wait for notes)
  await service.from('patients')
    .update({ last_session_date: now.split('T')[0] })
    .eq('id', session.patient_id);

  // 4. Kick off note generation in the background — waitUntil() keeps this
  //    invocation alive until the promise settles, without delaying the
  //    response below. Any failure still lands on the session as
  //    status: 'failed' inside runNoteGeneration's own try/catch.
  waitUntil(
    runNoteGeneration(sessionId, { speakerMap, manualNotes }).catch(err => {
      console.error('[Kith] process-notes (waitUntil) failed:', err);
    }),
  );

  // 5. Return immediately — client navigates to patient profile
  return NextResponse.json({
    ok: true,
    patientId: session.patient_id,
    sessionId,
  });
}
