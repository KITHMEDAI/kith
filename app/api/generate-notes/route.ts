import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateSessionNotes, generateLiveNotesUpdate } from '@/lib/claude';
import { parseTranscriptWithDiarization } from '@/lib/deepgram';
import type { TranscriptSegment, Patient } from '@/types';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { session_id, transcript, patientId, sessionNumber, manualNotes, liveOnly } = body;

  const supabase = createServiceRoleClient();

  // ── Live 2-min update path ─────────────────────────────────────────────────
  if (liveOnly && transcript && patientId) {
    const { data: patientRow } = await supabase
      .from('patients')
      .select('id, display_name, diagnosis, therapy_modality, gender, date_of_birth')
      .eq('id', patientId)
      .single();

    const patient = (patientRow || { id: patientId, display_name: 'Patient', diagnosis: [] }) as Patient;

    try {
      const result = await generateLiveNotesUpdate({
        transcript: transcript as TranscriptSegment[],
        patient,
        sessionNumber: sessionNumber || 1,
      });

      // Return in the shape the session page expects: { notes: { ... } }
      return NextResponse.json({
        notes: {
          key_points: result.key_points,
          risk_flags: { level: result.risk_level, flags: [] },
          suggested_questions: result.suggested_questions,
          treatment_suggestions: result.treatment_suggestions,
          mindfulness_suggestions: result.mindfulness_suggestions,
        },
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Live update failed' },
        { status: 500 },
      );
    }
  }

  // ── Full post-session notes path ───────────────────────────────────────────
  const token = req.headers.get('x-internal-token');
  if (token !== process.env.NEXTAUTH_SECRET && token !== 'internal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 422 });

  const { data: session } = await supabase
    .from('sessions')
    .select(`
      id, transcript_raw, therapist_id, patient_id,
      patient:patients(display_name, diagnosis, date_of_birth, gender, therapy_modality, therapy_goals)
    `)
    .eq('id', session_id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patient = (Array.isArray(session.patient) ? session.patient[0] : session.patient) as unknown as Patient | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTranscript: any[] = (session as any).transcript_raw || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segments: any[] = rawTranscript.length > 0
    ? parseTranscriptWithDiarization(rawTranscript)
    : [];

  try {
    const notes = await generateSessionNotes({
      transcript: segments,
      patient: patient || ({ id: '', display_name: 'Patient', diagnosis: [] } as unknown as Patient),
      sessionNumber: sessionNumber || 1,
      manualNotes,
    });

    const riskLevel = notes.risk_flags?.level || 'low';

    await supabase
      .from('sessions')
      .update({
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
      })
      .eq('id', session_id);

    await supabase
      .from('patients')
      .update({ risk_level: riskLevel })
      .eq('id', (session as { patient_id?: string }).patient_id || '');

    return NextResponse.json({ ok: true, notes });
  } catch (err) {
    await supabase
      .from('sessions')
      .update({ status: 'failed' })
      .eq('id', session_id);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Note generation failed' },
      { status: 500 },
    );
  }
}
