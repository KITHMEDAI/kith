/**
 * POST /api/sessions/process-notes
 *
 * Long-running background route — called fire-and-forget from /api/sessions/end.
 * Runs the full Haiku → Sonnet clinical note pipeline and saves results to DB.
 *
 * Auth: validated via x-internal-secret header (no user session cookie needed
 * because this runs after the user has already navigated away).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateSessionNotes } from '@/lib/claude';
import type { Patient } from '@/types';

// Up to 5 minutes — Claude Haiku + Sonnet on a long session can take 60-90 s
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // Internal auth — not a user-facing endpoint
  const secret = req.headers.get('x-internal-secret');
  const expected = process.env.INTERNAL_API_SECRET || 'kith-internal-dev';
  if (secret !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { sessionId, speakerMap = {}, manualNotes = '' } = body;
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 422 });

  const service = createServiceRoleClient();

  // Fetch session (transcript saved by end route)
  const { data: session, error: sessionErr } = await service
    .from('sessions')
    .select('id, started_at, ended_at, patient_id, therapist_id, session_number, transcript_raw, manual_notes, status')
    .eq('id', sessionId)
    .single();

  if (sessionErr || !session) {
    console.error('[Kith] process-notes: session not found', sessionId, sessionErr?.message);
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Guard: only process sessions in processing state
  if (session.status !== 'processing') {
    console.warn('[Kith] process-notes: session not in processing state', session.status);
    return NextResponse.json({ skipped: true, status: session.status });
  }

  // Fetch patient data for AI context
  const { data: patientRow } = await service
    .from('patients')
    .select('id, display_name, diagnosis, therapy_modality, gender, date_of_birth, therapy_goals, risk_level')
    .eq('id', session.patient_id)
    .single();

  const patient = (patientRow as unknown as Patient | null) ?? ({
    id: session.patient_id,
    display_name: 'Patient',
    diagnosis: [],
  } as unknown as Patient);

  // Fetch previous session summary for continuity context
  const { data: prevSession } = await service
    .from('sessions')
    .select('session_summary')
    .eq('patient_id', session.patient_id)
    .eq('status', 'completed')
    .neq('id', sessionId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const transcript = (session.transcript_raw as import('@/types').TranscriptSegment[]) || [];
  const notes_manual = (session.manual_notes as string) || manualNotes || '';
  const sessionNumber = (session.session_number as number) || 1;
  const durationMinutes = session.ended_at
    ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
    : 0;

  console.log(`[Kith] process-notes: generating notes for session ${sessionId}, ${transcript.length} segments, ${durationMinutes} min`);

  try {
    const notes = await generateSessionNotes({
      transcript,
      patient,
      sessionNumber,
      previousSessionSummary: prevSession?.session_summary ?? undefined,
      manualNotes: notes_manual,
      speakerMap,
    });

    const riskLevel = notes.risk_flags?.level || 'low';

    // Save all notes to session row
    const { error: updateErr } = await service.from('sessions').update({
      status: 'completed',
      soap_note: notes.soap_note,
      key_points: notes.key_points,
      session_summary: notes.session_summary,
      ai_suggestions: notes.ai_suggestions,
      homework_assigned: notes.homework_assigned,
      next_session_plan: notes.next_session_plan,
      risk_level: riskLevel,
      risk_flags: notes.risk_flags,
      resource_suggestions: notes.resource_suggestions,
      notes_generated_at: new Date().toISOString(),
    }).eq('id', sessionId);

    if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`);

    // Update patient risk level
    await service.from('patients')
      .update({ risk_level: riskLevel })
      .eq('id', session.patient_id);

    // Write patient_metrics row (best-effort — don't fail the whole pipeline if this errors)
    try {
      await service.from('patient_metrics').insert({
        patient_id:               session.patient_id,
        therapist_id:             session.therapist_id,
        session_id:               sessionId,
        homework_completed:       notes.homework_assigned ? true : null,
        session_duration_minutes: durationMinutes > 0 ? durationMinutes : null,
      });
    } catch (metricsErr) {
      console.warn('[Kith] patient_metrics insert failed (non-fatal):', metricsErr);
    }

    console.log(`[Kith] process-notes: completed for session ${sessionId}, risk=${riskLevel}`);
    return NextResponse.json({ ok: true, sessionId, riskLevel });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Kith] process-notes FAILED:', msg);

    // Only mark failed — don't overwrite if somehow already completed
    await service.from('sessions')
      .update({ status: 'failed' })
      .eq('id', sessionId)
      .eq('status', 'processing'); // conditional: only if still processing

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
