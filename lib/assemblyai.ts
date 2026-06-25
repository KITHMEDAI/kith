import { USE_MOCK, mockRealtimeToken, mockTranscript } from './mock';

// Lazy-init the AssemblyAI client only when a real key exists
function getClient() {
  if (!process.env.ASSEMBLYAI_API_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AssemblyAI = require('assemblyai').default;
  return new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
}

export async function getRealtimeToken(): Promise<string> {
  if (USE_MOCK) return mockRealtimeToken();
  const client = getClient();
  if (!client) return mockRealtimeToken();
  // language_code omitted → AssemblyAI auto-detects per utterance.
  // This handles multilingual sessions (Hindi, Tamil, Hinglish, etc.) without
  // any action required from the therapist.
  const token = await client.realtime.createTemporaryToken({ expires_in: 3600 });
  return token;
}

export async function transcribeRecording(audioUrl: string): Promise<{
  id: string;
  text: string;
  utterances: Array<{ speaker: string; text: string; start: number; end: number; confidence: number }>;
  confidence: number;
}> {
  if (USE_MOCK) {
    const segments = mockTranscript();
    return {
      id: 'mock_transcript_' + Date.now(),
      text: segments.map(s => s.text).join(' '),
      utterances: segments.map(s => ({
        speaker: s.speaker === 'doctor' ? 'A' : 'B',
        text: s.text,
        start: s.start_ms,
        end: s.end_ms,
        confidence: s.confidence,
      })),
      confidence: 0.97,
    };
  }

  const client = getClient();
  if (!client) throw new Error('AssemblyAI API key not configured');

  const transcript = await client.transcripts.transcribe({
    audio_url: audioUrl,
    speaker_labels: true,          // diarization — returns A, B, C labels
    language_detection: true,      // auto-detect per utterance (handles multilingual/Hinglish)
    // language_code intentionally omitted — let AssemblyAI detect
    speech_model: 'slam-1',        // highest accuracy for conversational/clinical speech
  });

  if (transcript.status === 'error') throw new Error(transcript.error || 'Transcription failed');

  return {
    id: transcript.id,
    text: transcript.text || '',
    utterances: (transcript.utterances || []).map((u: { speaker: string; text: string; start: number; end: number; confidence: number }) => ({
      speaker: u.speaker,
      text: u.text,
      start: u.start,
      end: u.end,
      confidence: u.confidence,
    })),
    confidence: transcript.confidence || 0,
  };
}

/**
 * Convert AssemblyAI utterances into TranscriptSegments keeping the raw
 * speaker labels (A, B, C …) as-is.  Role inference (who is clinician, who
 * is patient) is intentionally deferred to the Claude pipeline — it reads
 * the full conversational context and is far more reliable than any
 * heuristic we could apply here.
 *
 * On-screen we show "Speaker A / Speaker B" which is neutral and requires
 * zero action from the therapist before or during the session.
 */
export function parseTranscriptWithDiarization(
  utterances: Array<{ speaker: string; text: string; start: number; end: number; confidence: number }>
) {
  return utterances.map((u) => ({
    // Keep the raw label — Claude will infer 'clinician' vs 'patient'
    speaker: `Speaker ${u.speaker}` as string,
    text: u.text,
    start_ms: u.start,
    end_ms: u.end,
    confidence: u.confidence,
    is_partial: false,
  }));
}
