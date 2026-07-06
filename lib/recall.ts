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
  // Ultra+ only (costs extra on top of the base recording fee — see
  // lib/entitlements.ts liveOnlineUpdates). Switches from the free
  // platform-captions transcript to Recall's own streaming transcription, and
  // adds a realtime webhook so utterances arrive DURING the call instead of
  // only after the bot leaves — lets suggestions/homework update live.
  liveUpdates?: boolean;
}): Promise<{ id: string }> {
  if (RECALL_MOCK) return { id: `mock_bot_${Date.now()}` };

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhooks/recall`;

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
      // Default: transcribe via the meeting platform's own captions — free,
      // works out of the box, but only available after the bot leaves the
      // call (via `transcript.done` / `recordings[].media_shortcuts.transcript
      // .data.download_url`, read by getRecallTranscript()).
      // Live-updates plans instead use Recall's own streaming provider plus a
      // realtime webhook, so `transcript.data` events arrive while the call is
      // still going — handled in app/api/webhooks/recall/route.ts.
      // NOTE: `recallai_async` is NOT valid here — that provider is only for the
      // separate post-call "Create Async Transcript" endpoint, not Create Bot.
      recording_config: opts.liveUpdates ? {
        transcript: { provider: { recallai_streaming: {} } },
        realtime_endpoints: [
          { type: 'webhook', url: webhookUrl, events: ['transcript.data'] },
        ],
      } : {
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
export interface RecallTranscriptResult {
  segments: TranscriptSegment[];
  // False means the bot never actually recorded anything — most commonly it
  // sat in the meeting platform's waiting room and was never admitted, so it
  // left with zero recordings. That's a PERMANENT state (no later webhook
  // will ever bring a transcript), distinct from "recorded fine, transcript
  // file just isn't ready yet" — callers need to tell these apart so a
  // never-admitted bot fails the session instead of waiting forever.
  hadRecording: boolean;
}

export async function getRecallTranscript(botId: string): Promise<RecallTranscriptResult> {
  if (RECALL_MOCK) return { segments: mockTranscript(), hadRecording: true };

  // 1. Get the bot — its recording carries a short-lived transcript download URL.
  const botRes = await fetch(`${BASE}/bot/${botId}/`, {
    headers: { Authorization: `Token ${API_KEY}` },
  });
  if (!botRes.ok) throw new Error(`Recall getBot failed (${botRes.status})`);
  const bot = await botRes.json();

  const recordings = (bot as { recordings?: unknown[] })?.recordings;
  const hadRecording = Array.isArray(recordings) && recordings.length > 0;

  const url = transcriptDownloadUrl(bot);
  if (!url) return { segments: [], hadRecording };

  // 2. The download URL is a presigned link (no auth header).
  const tRes = await fetch(url);
  if (!tRes.ok) throw new Error(`Recall transcript download failed (${tRes.status})`);
  const raw = await tRes.json();
  return { segments: normaliseTranscript(raw), hadRecording };
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

// Shared by the post-call batch transcript (normaliseTranscript) and the
// realtime `transcript.data` webhook (normaliseRealtimeEntry), so a live
// utterance ends up in exactly the same shape as one from the final file.
function entryToSegment(entry: RecallEntry): TranscriptSegment | null {
  const words = entry.words || [];
  const text = words.map(w => w.text).join(' ').trim();
  if (!text) return null;
  const speaker = entry.participant?.name?.trim()
    || `Speaker ${entry.participant?.id ?? '?'}`;
  const start = words[0]?.start_timestamp?.relative ?? 0;
  const end   = words[words.length - 1]?.end_timestamp?.relative ?? start;
  return {
    speaker,
    text,
    start_ms: Math.round(start * 1000),
    end_ms: Math.round(end * 1000),
    confidence: 0.95,
    is_partial: false,
  };
}

// Normalises one `transcript.data` webhook event's `data.data` payload
// ({ words, participant }) into the same TranscriptSegment shape used
// everywhere else. Returns null for an empty/no-text utterance.
export function normaliseRealtimeEntry(data: unknown): TranscriptSegment | null {
  return entryToSegment((data || {}) as RecallEntry);
}

function normaliseTranscript(raw: unknown): TranscriptSegment[] {
  if (!Array.isArray(raw)) return [];
  const segments: TranscriptSegment[] = [];
  for (const entry of raw as RecallEntry[]) {
    const seg = entryToSegment(entry);
    if (seg) segments.push(seg);
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
