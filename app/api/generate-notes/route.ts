import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateLiveNotesUpdate } from '@/lib/claude';
import type { TranscriptSegment, Patient } from '@/types';

// Live 2-min in-session AI update (key points / suggestions), polled from the
// session page while recording. The old "full post-session notes" path that
// used to live here is gone — that pipeline is /api/sessions/end +
// /api/sessions/process-notes now, and this one was dead code guarded by a
// hardcoded backdoor (`x-internal-token: internal` bypassed the check
// regardless of any real secret) that let anyone regenerate/overwrite any
// therapist's session notes by guessing a session_id.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { transcript, patientId, sessionNumber } = body;
  if (!transcript || !patientId) return NextResponse.json({ error: 'Missing fields' }, { status: 422 });

  const { data: patientRow } = await supabase
    .from('patients')
    .select('id, display_name, diagnosis, therapy_modality, gender, date_of_birth, therapist_id')
    .eq('id', patientId)
    .single();

  if (!patientRow || patientRow.therapist_id !== therapist.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await generateLiveNotesUpdate({
      transcript: transcript as TranscriptSegment[],
      patient: patientRow as unknown as Patient,
      sessionNumber: sessionNumber || 1,
    });

    // Shape the session page expects: { notes: { ... } }
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
