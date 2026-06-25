/**
 * POST /api/sessions/bot/stop
 *
 * Manually end an ONLINE (bot-recorded) session — e.g. the doctor closed the
 * Meet tab without leaving, so the bot is still in the call and the session is
 * stuck "in session". This pulls the bot out and finalises the session.
 *
 * Body: { sessionId }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { stopRecallBot } from '@/lib/recall';
import { finalizeOnlineSession } from '@/lib/online-session';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { sessionId } = await req.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 422 });

  const service = createServiceRoleClient();
  const { data: session } = await service
    .from('sessions')
    .select('id, therapist_id, recall_bot_id, status, patient_id')
    .eq('id', sessionId)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.therapist_id !== therapist.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Already wrapping up or done — nothing to stop.
  if (session.status === 'completed' || session.status === 'processing') {
    return NextResponse.json({ ok: true, patientId: session.patient_id, alreadyEnding: true });
  }

  // 1. Pull the bot out of the call. Recall then finishes the recording and
  //    fires transcript.done → the webhook finalises with the full transcript.
  if (session.recall_bot_id) {
    await stopRecallBot(session.recall_bot_id).catch(() => {});
  }

  // 2. Best-effort immediate finalise: flips the session to "processing" now so
  //    it's no longer stuck "in session". If the transcript isn't ready yet, it
  //    just changes status and waits for the webhook to generate the notes.
  await finalizeOnlineSession(sessionId, session.recall_bot_id).catch(() => {});

  return NextResponse.json({ ok: true, patientId: session.patient_id });
}
