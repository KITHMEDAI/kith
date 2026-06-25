/**
 * lib/recall.ts
 *
 * Thin client for Recall.ai — the meeting-bot service that records online
 * sessions (Teams / Google Meet / Zoom) without the doctor changing anything.
 *
 * A bot joins the call, records both sides, and Recall transcribes it. We then
 * normalise that transcript into our TranscriptSegment[] and run the same
 * clinical-note pipeline as in-person sessions.
 *
 * Mock mode (no RECALL_API_KEY or NEXT_PUBLIC_USE_MOCK=true) returns a fake bot
 * + the standard mock transcript, so the whole online flow is testable locally
 * without a real meeting.
 */

import crypto from 'crypto';
import type { TranscriptSegment } from '@/types';
import { mockTranscript } from '@/lib/mock';

const REGION  = process.env.RECALL_REGION || 'us-east-1';
const API_KEY = process.env.RECALL_API_KEY || '';
const BASE    = `https://${REGION}.recall.ai/api/v1`;

export const RECALL_MOCK =
  !API_KEY || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

const BOT_NAME = 'Kith Notetaker';

// ── Create a bot that joins a meeting and records it ──────────────────────────
export async function createRecallBot(opts: {
  meetingUrl: string;
  metadata?: Record<string, string>;
}): Promise<{ id: string }> {
  if (RECALL_MOCK) return { id: `mock_bot_${Date.now()}` };

  const res = await fetch(`${BASE}/bot/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      meeting_url: opts.meetingUrl,
      bot_name: BOT_NAME,
      metadata: opts.metadata || {},
      // Transcribe via the meeting platform's own captions — works out of the box
      // with no third-party transcription key. The transcript is available after
      // the call via the `transcript.done` webhook (recordings[].media_shortcuts.
      // transcript.data.download_url), which getRecallTranscript() reads.
      // NOTE: `recallai_async` is NOT valid here — that provider is only for the
      // separate post-call "Create Async Transcript" endpoint, not Create Bot.
      recording_config: {
        transcript: { provider: { meeting_captions: {} } },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Recall createBot failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return { id: data.id };
}

// ── Remove a bot from a call early (optional / "stop notetaker") ──────────────
export async function stopRecallBot(botId: string): Promise<void> {
  if (RECALL_MOCK) return;
  await fetch(`${BASE}/bot/${botId}/leave_call/`, {
    method: 'POST',
    headers: { Authorization: `Token ${API_KEY}` },
  }).catch(() => {});
}

// ── Fetch + normalise the finished transcript ─────────────────────────────────
export async function getRecallTranscript(botId: string): Promise<TranscriptSegment[]> {
  if (RECALL_MOCK) return mockTranscript();

  // 1. Get the bot — its recording carries a short-lived transcript download URL.
  const botRes = await fetch(`${BASE}/bot/${botId}/`, {
    headers: { Authorization: `Token ${API_KEY}` },
  });
  if (!botRes.ok) throw new Error(`Recall getBot failed (${botRes.status})`);
  const bot = await botRes.json();

  const url = transcriptDownloadUrl(bot);
  if (!url) return [];

  // 2. The download URL is a presigned link (no auth header).
  const tRes = await fetch(url);
  if (!tRes.ok) throw new Error(`Recall transcript download failed (${tRes.status})`);
  const raw = await tRes.json();
  return normaliseTranscript(raw);
}

// recordings[].media_shortcuts.transcript.data.download_url
function transcriptDownloadUrl(bot: unknown): string | null {
  const recordings = (bot as { recordings?: unknown[] })?.recordings;
  if (!Array.isArray(recordings)) return null;
  for (const rec of recordings) {
    const url = (rec as { media_shortcuts?: { transcript?: { data?: { download_url?: string } } } })
      ?.media_shortcuts?.transcript?.data?.download_url;
    if (url) return url;
  }
  return null;
}

// Recall transcript file = array of { participant, words[] }. Each entry becomes
// one segment, labelled with the real participant name (deterministic speakers).
interface RecallWord { text: string; start_timestamp?: { relative?: number }; end_timestamp?: { relative?: number } }
interface RecallEntry { participant?: { id?: number; name?: string | null }; words?: RecallWord[] }

function normaliseTranscript(raw: unknown): TranscriptSegment[] {
  if (!Array.isArray(raw)) return [];
  const segments: TranscriptSegment[] = [];
  for (const entry of raw as RecallEntry[]) {
    const words = entry.words || [];
    const text = words.map(w => w.text).join(' ').trim();
    if (!text) continue;
    const speaker = entry.participant?.name?.trim()
      || `Speaker ${entry.participant?.id ?? '?'}`;
    const start = words[0]?.start_timestamp?.relative ?? 0;
    const end   = words[words.length - 1]?.end_timestamp?.relative ?? start;
    segments.push({
      speaker,
      text,
      start_ms: Math.round(start * 1000),
      end_ms: Math.round(end * 1000),
      confidence: 0.95,
      is_partial: false,
    });
  }
  return segments;
}

// ── Webhook signature verification (Svix scheme, dependency-free) ─────────────
// Recall signs webhooks with Svix. headerGet returns a header value by name.
export function verifyRecallSignature(
  rawBody: string,
  headerGet: (name: string) => string | null,
): boolean {
  const secret = process.env.RECALL_WEBHOOK_SECRET || '';
  if (!secret) return false;

  const id        = headerGet('svix-id')        || headerGet('webhook-id');
  const timestamp = headerGet('svix-timestamp') || headerGet('webhook-timestamp');
  const sigHeader = headerGet('svix-signature') || headerGet('webhook-signature');
  if (!id || !timestamp || !sigHeader) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const signed = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secretBytes).update(signed).digest('base64');

  // Header is a space-separated list of "v1,<base64sig>" entries.
  const provided = sigHeader.split(' ').map(s => s.split(',')[1]).filter(Boolean);
  return provided.some(sig => {
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch { return false; }
  });
}
