/**
 * Deepgram callback webhook (optional — only needed if using async batch transcription).
 * For live streaming sessions, transcripts are built incrementally in the browser
 * and saved to the DB directly — this webhook is only hit if you submit a
 * recorded audio file for post-session batch transcription.
 *
 * Deepgram sends a POST to this URL when async transcription is complete.
 * Verify with the secret set in Deepgram dashboard → Callbacks → Secret.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { parseTranscriptWithDiarization } from '@/lib/deepgram';
import { generateSessionNotes } from '@/lib/claude';
import { createHmac } from 'crypto';

function verifyDeepgramWebhook(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.DEEPGRAM_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification if no secret configured (dev mode)
  const signature = req.headers.get('x-deepgram-signature');
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return signature === expected;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifyDeepgramWebhook(req, rawBody)) {
    console.warn('[Kith] Deepgram webhook: unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Deepgram callback shape
  const requestId = (body.metadata as { request_id?: string })?.request_id;
  const results = body.results as {
    channels?: Array<{ alternatives?: Array<{ transcript?: string; confidence?: number }> }>;
    utterances?: Array<{ speaker: number; transcript: string; start: number; end: number; confidence: number }>;
  } | undefined;

  if (!requestId || !results) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Find session by deepgram_request_id
  const { data: session } = await supabase
    .from('sessions')
    .select('*, patient:patients(*)')
    .eq('deepgram_request_id', requestId)
    .single();

  if (!session) {
    console.warn(`[Kith] No session for deepgram_request_id: ${requestId}`);
    return NextResponse.json({ received: true });
  }

  const transcript = results.channels?.[0]?.alternatives?.[0]?.transcript || '';
  const confidence = results.channels?.[0]?.alternatives?.[0]?.confidence || 0;

  // Normalise utterances: Deepgram returns speaker as number, start/end in seconds
  const rawUtterances = (results.utterances || []).map(u => ({
    speaker: String(u.speaker),
    text: u.transcript,
    start: Math.round(u.start * 1000),
    end: Math.round(u.end * 1000),
    confidence: u.confidence,
  }));

  const diarizedSegments = parseTranscriptWithDiarization(rawUtterances);

  // Save transcript
  await supabase
    .from('sessions')
    .update({
      transcript_raw: transcript,
      transcript_segments: diarizedSegments,
      transcription_confidence: confidence,
      status: 'processing',
    })
    .eq('id', session.id);

  // Generate AI notes
  try {
    const { data: prevSession } = await supabase
      .from('sessions')
      .select('session_summary')
      .eq('patient_id', session.patient_id)
      .eq('therapist_id', session.therapist_id)
      .lt('session_number', session.session_number)
      .order('session_number', { ascending: false })
      .limit(1)
      .single();

    const notes = await generateSessionNotes({
      transcript: diarizedSegments,
      patient: session.patient,
      sessionNumber: session.session_number,
      previousSessionSummary: prevSession?.session_summary ?? undefined,
      manualNotes: session.manual_notes ?? undefined,
    });

    await supabase
      .from('sessions')
      .update({
        soap_note: notes.soap_note,
        key_points: notes.key_points,
        session_summary: notes.session_summary,
        ai_suggestions: notes.ai_suggestions,
        resource_suggestions: notes.resource_suggestions,
        risk_flags: notes.risk_flags,
        homework_assigned: notes.homework_assigned,
        next_session_plan: notes.next_session_plan,
        status: 'completed',
      })
      .eq('id', session.id);

    if (notes.risk_flags.level === 'high' || notes.risk_flags.level === 'critical') {
      await supabase
        .from('patients')
        .update({ risk_level: notes.risk_flags.level })
        .eq('id', session.patient_id);
    }
  } catch (err) {
    console.error('[Kith] Note generation failed:', err);
    await supabase
      .from('sessions')
      .update({ status: 'failed', notes_error: err instanceof Error ? err.message : 'Unknown' })
      .eq('id', session.id);
  }

  return NextResponse.json({ received: true });
}
