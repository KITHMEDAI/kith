/**
 * POST /api/sessions/end
 *
 * Fast path (~200 ms):
 *   1. Verify auth
 *   2. Save transcript → mark session "processing"
 *   3. Update appointment status
 *   4. Fire-and-forget → /api/sessions/process-notes  (runs independently, up to 5 min)
 *   5. Return { ok, patientId } immediately so the client can navigate away
 *
 * Note generation happens in process-notes, NOT here.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { TranscriptSegment } from '@/types';

export const maxDuration = 30;  // this route is fast — 30 s is plenty

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

  // 4. Fire-and-forget: trigger background note generation
  //    This creates an INDEPENDENT serverless invocation — end route returns before it finishes.
  //    Derive the base URL from the actual request origin first so the trigger always
  //    hits the same server/port it's running on (env is only a fallback).
  const baseUrl = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
  const internalSecret = process.env.INTERNAL_API_SECRET || 'kith-internal-dev';

  // Don't await — let it run independently
  fetch(`${baseUrl}/api/sessions/process-notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret,
    },
    body: JSON.stringify({ sessionId, speakerMap, manualNotes }),
  }).catch(err => {
    // Best-effort — patient profile will show "failed" if this silently errors
    console.error('[Kith] process-notes trigger failed:', err);
  });

  // 5. Return immediately — client navigates to patient profile
  return NextResponse.json({
    ok: true,
    patientId: session.patient_id,
    sessionId,
  });
}
