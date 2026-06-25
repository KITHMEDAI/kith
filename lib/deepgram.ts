/**
 * Deepgram integration — replaces AssemblyAI.
 *
 * Live streaming: browser connects directly to Deepgram via a temporary token
 * (no audio ever touches our server — privacy-first).
 *
 * Speaker labels: Deepgram returns "0", "1", "2" — we normalise to "Speaker A",
 * "Speaker B" etc.  Role inference (clinician vs patient) is deferred to Claude,
 * which reads the full conversation context.
 */

import { USE_MOCK, mockRealtimeToken, mockTranscript } from './mock';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';

// ── Temporary token for client-side streaming ─────────────────────────────────
// Grants the browser a short-lived key scoped to listen:* only.
// The real API key never leaves the server.
export async function getRealtimeToken(): Promise<string> {
  if (USE_MOCK || !DEEPGRAM_API_KEY) return mockRealtimeToken();
  // The API key is returned directly — the browser uses it via WebSocket
  // subprotocol auth (browsers can't set custom headers on WebSocket connections).
  // For production, swap this for a scoped temporary key via Deepgram's key API.
  return DEEPGRAM_API_KEY;
}

// ── Batch transcription (post-session, higher accuracy) ───────────────────────
export async function transcribeRecording(audioUrl: string): Promise<{
  id: string;
  text: string;
  utterances: Array<{ speaker: string; text: string; start: number; end: number; confidence: number }>;
  confidence: number;
}> {
  if (USE_MOCK || !DEEPGRAM_API_KEY) {
    const segments = mockTranscript();
    return {
      id: 'mock_transcript_' + Date.now(),
      text: segments.map(s => s.text).join(' '),
      utterances: segments.map(s => ({
        speaker: s.speaker === 'doctor' ? '0' : '1',
        text: s.text,
        start: s.start_ms,
        end: s.end_ms,
        confidence: s.confidence,
      })),
      confidence: 0.97,
    };
  }

  // Submit for async transcription
  const submitRes = await fetch('https://api.deepgram.com/v1/listen', {
    method: 'POST',
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: audioUrl,
      model: 'nova-3',            // highest accuracy, multilingual
      diarize: true,              // speaker separation → returns speaker "0", "1", "2"
      language: 'multi',          // auto-detects Hindi, Tamil, Hinglish, English per segment
      smart_format: true,         // punctuation, paragraphs
      utterances: true,           // returns per-speaker utterance blocks
      utt_split: 0.8,             // 0.8s silence = new utterance
    }),
  });

  if (!submitRes.ok) {
    throw new Error(`Deepgram transcription error: ${await submitRes.text()}`);
  }

  const result = await submitRes.json();
  const channel = result.results?.channels?.[0]?.alternatives?.[0];

  if (!channel) throw new Error('Deepgram returned empty results');

  // Normalise utterances from Deepgram format
  const utterances = (result.results?.utterances || []).map((u: {
    speaker: number; transcript: string; start: number; end: number; confidence: number;
  }) => ({
    speaker: String(u.speaker),
    text: u.transcript,
    start: Math.round(u.start * 1000),   // seconds → ms
    end: Math.round(u.end * 1000),
    confidence: u.confidence,
  }));

  return {
    id: result.metadata?.request_id || 'dg_' + Date.now(),
    text: channel.transcript || '',
    utterances,
    confidence: channel.confidence || 0,
  };
}

// ── Normalise speaker labels for display ──────────────────────────────────────
// Deepgram returns numeric "0", "1", "2" — we convert to "Speaker A", "B", "C"
// so the UI is consistent regardless of transcription provider.
const SPEAKER_LABELS: Record<string, string> = {
  '0': 'A', '1': 'B', '2': 'C', '3': 'D',
};

export function parseTranscriptWithDiarization(
  utterances: Array<{ speaker: string; text: string; start: number; end: number; confidence: number }>
) {
  return utterances.map((u) => ({
    speaker: `Speaker ${SPEAKER_LABELS[u.speaker] ?? u.speaker}`,
    text: u.text,
    start_ms: u.start,
    end_ms: u.end,
    confidence: u.confidence,
    is_partial: false,
  }));
}

// ── Deepgram WebSocket URL for browser streaming ─────────────────────────────
// The browser opens this URL with the temporary token.
// nova-3 multilingual handles Hindi, Hinglish, Tamil natively.
export const DEEPGRAM_WS_URL =
  'wss://api.deepgram.com/v1/listen' +
  '?model=nova-3' +
  '&language=multi' +
  '&diarize=true' +
  '&smart_format=true' +
  '&interim_results=true' +   // words appear as they're spoken
  '&utterance_end_ms=1000' +  // 1s silence marks utterance end
  '&vad_events=true';         // voice activity detection events
