/**
 * lib/process-notes.ts
 *
 * The actual clinical-note generation + save, as a plain function so every
 * trigger site (session end, Recall webhook finalize, manual retry) can call
 * it directly in-process instead of firing an HTTP request at itself.
 *
 * Previously this lived only inside the /api/sessions/process-notes route
 * handler, and every caller reached it via an un-awaited `fetch()`. On
 * Vercel's serverless runtime that's not safe: once the calling handler's
 * response is sent, the function instance can be frozen before the fetch
 * even completes its handshake — silently dropping note generation and
 * leaving the session stuck at status "processing" forever, with nothing
 * logged. Calling this directly and wrapping it in `waitUntil()` (see
 * @vercel/functions) keeps the invocation alive until the promise settles.
 */
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateSessionNotes } from '@/lib/claude';
import type { Patient } from '@/types';

export interface RunNoteGenerationResult {
  ok: boolean;
  skipped?: boolean;
  riskLevel?: string;
  error?: string;
}

export async function runNoteGeneration(
  sessionId: string,
  opts: {
    speakerMap?: Record<string, { role: string; name: string | null; display: string }>;
    manualNotes?: string;
  } = {},
): Promise<RunNoteGenerationResult> {
  const { speakerMap = {}, manualNotes = '' } = opts;
  const service = createServiceRoleClient();

  const { data: session, error: sessionErr } = await service
    .from('sessions')
    .select('id, started_at, ended_at, patient_id, therapist_id, session_number, transcript_raw, manual_notes, status')
    .eq('id', sessionId)
    .single();

  if (sessionErr || !session) {
    console.error('[Kith] process-notes: session not found', sessionId, sessionErr?.message);
    return { ok: false, error: 'Session not found' };
  }

  // Guard: only process sessions in processing state — also makes this safe
  // to call more than once for the same session (webhook + watchdog retry).
  if (session.status !== 'processing') {
    console.warn('[Kith] process-notes: session not in processing state', session.status);
    return { ok: true, skipped: true };
  }

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
  const notesManual = (session.manual_notes as string) || manualNotes || '';
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
      manualNotes: notesManual,
      speakerMap,
    });

    const riskLevel = notes.risk_flags?.level || 'low';

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

    await service.from('patients')
      .update({ risk_level: riskLevel })
      .eq('id', session.patient_id);

    // Best-effort — don't fail the whole pipeline if this errors.
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
    return { ok: true, riskLevel };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Kith] process-notes FAILED:', msg);

    // Only mark failed — don't overwrite if somehow already completed.
    await service.from('sessions')
      .update({ status: 'failed' })
      .eq('id', sessionId)
      .eq('status', 'processing');

    return { ok: false, error: msg };
  }
}
