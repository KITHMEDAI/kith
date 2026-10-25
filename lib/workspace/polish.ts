/**
 * lib/workspace/polish.ts
 *
 * "Polish pass": after a recording stops, the browser uploads the audio to the
 * private `ws-audio` bucket. Here the server has Deepgram transcribe the
 * WHOLE file (pre-recorded API): more accurate than live streaming and much
 * better at separating speakers. The audio is deleted right after.
 *
 * Tracks:
 *   - "room": in-person Record (one mic, diarized → Speaker A/B/…)
 *   - "tab":  online meeting tab audio (everyone else, diarized → Participant N)
 *   - "mic":  your own mic during an online meeting (→ "<name> (me)")
 */
import { keytermsForField, MAX_KEYTERMS } from './keyterms';

export type AudioTrack = 'room' | 'tab' | 'mic';
export interface AudioRef { track: AudioTrack; path: string }

type Utt = { start: number; end: number; speaker: number; text: string; track: AudioTrack };

const BUCKET = 'ws-audio';

// Exactly what /api/w/audio/upload-url issues: "<userId>/<uuid>.<ext>".
const PATH_RE = /^([0-9a-f-]{36})\/[0-9a-f-]{36}\.(webm|ogg|mp4|m4a)$/;

/** True when `path` is a recording in this user's own folder. */
export function isOwnAudioPath(path: string, userId: string): boolean {
  const m = PATH_RE.exec(path);
  return !!m && m[1] === userId;
}

/** Parses "<track>:<path>" entries. With `userId`, drops anything not in that user's folder. */
export function parseAudioPaths(raw: string[] | null | undefined, userId?: string): AudioRef[] {
  return (raw ?? []).map(s => {
    const i = s.indexOf(':');
    return { track: s.slice(0, i) as AudioTrack, path: s.slice(i + 1) };
  }).filter(a => ['room', 'tab', 'mic'].includes(a.track) && a.path && (!userId || isOwnAudioPath(a.path, userId)));
}

/**
 * Deletes recordings ("<track>:<path>" entries or refs). Returns false if the
 * storage API reported an error (supabase-js returns errors, it doesn't throw),
 * so callers can keep the reference for the cleanup job to retry.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deleteAudio(service: any, audio: Array<string | AudioRef>): Promise<boolean> {
  const paths = audio.map(a => (typeof a === 'string' ? a.slice(a.indexOf(':') + 1) : a.path)).filter(Boolean);
  if (!paths.length) return true;
  try {
    const { error } = await service.storage.from(BUCKET).remove(paths);
    if (error) { console.warn('[workspace] audio delete failed:', error.message); return false; }
    return true;
  } catch (err) {
    console.warn('[workspace] audio delete failed:', (err as Error).message);
    return false;
  }
}

// A stuck transcription must finish (or fail) well inside the function's 300 s.
const DEEPGRAM_TIMEOUT_MS = 150_000;

async function transcribeFile(url: string, track: AudioTrack, keyterms: string[]): Promise<{ utts: Utt[]; seconds: number }> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error('DEEPGRAM_API_KEY missing');
  const qs = new URLSearchParams({
    model: 'nova-3', language: 'en', smart_format: 'true', punctuate: 'true',
    utterances: 'true', utt_split: '0.8', diarize: track === 'mic' ? 'false' : 'true',
    mip_opt_out: 'true', // never used by Deepgram for model training
  });
  keyterms.slice(0, MAX_KEYTERMS).forEach(k => qs.append('keyterm', k));
  const res = await fetch(`https://api.deepgram.com/v1/listen?${qs}`, {
    method: 'POST',
    headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(DEEPGRAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Deepgram ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json() as { metadata?: { duration?: number }; results?: { utterances?: Array<{ start: number; end: number; speaker?: number; transcript: string }> } };
  const utts = (j.results?.utterances ?? [])
    .filter(u => u.transcript?.trim())
    .map(u => ({ start: u.start, end: u.end, speaker: u.speaker ?? 0, text: u.transcript.trim(), track }));
  return { utts, seconds: Number(j.metadata?.duration) || 0 };
}

function words(s: string): Set<string> {
  return new Set((s.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter(w => w.length > 2));
}
function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let n = 0;
  a.forEach(w => { if (b.has(w)) n++; });
  return n / Math.min(a.size, b.size);
}

/** Mic lines that just echo what the meeting speakers said (no headphones) are dropped. */
function dropEcho(mic: Utt[], tab: Utt[]): Utt[] {
  return mic.filter(m => {
    const mw = words(m.text);
    return !tab.some(t => Math.abs(t.start - m.start) < 4 && overlap(mw, words(t.text)) >= 0.6);
  });
}

function label(u: Utt, youName: string): string {
  if (u.track === 'mic') return `${youName} (me)`;
  if (u.track === 'tab') return `Participant ${u.speaker + 1}`;
  return `Speaker ${String.fromCharCode(65 + Math.min(u.speaker, 25))}`;
}

/**
 * Returns the polished transcript ("Label: text" lines in time order) and the
 * audio seconds Deepgram processed, or a null transcript if nothing usable
 * came back. Always deletes the audio files afterwards.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function polishTranscript(service: any, audio: AudioRef[], field: string, youName: string, userTerms: string[] = []): Promise<{ transcript: string | null; seconds: number }> {
  let seconds = 0;
  let transcript: string | null = null;
  try {
    const keyterms = keytermsForField(field, userTerms);
    const perTrack = await Promise.all(audio.map(async a => {
      const { data, error } = await service.storage.from(BUCKET).createSignedUrl(a.path, 300);
      if (error || !data?.signedUrl) throw new Error(`signed url: ${error?.message}`);
      return transcribeFile(data.signedUrl, a.track, keyterms);
    }));
    seconds = perTrack.reduce((n, t) => n + t.seconds, 0);
    let all = perTrack.flatMap(t => t.utts);
    const tab = all.filter(u => u.track === 'tab');
    if (tab.length) all = [...all.filter(u => u.track !== 'mic'), ...dropEcho(all.filter(u => u.track === 'mic'), tab)];
    all.sort((x, y) => x.start - y.start);

    // Merge consecutive lines from the same speaker.
    const lines: { who: string; text: string }[] = [];
    for (const u of all) {
      const who = label(u, youName);
      const last = lines[lines.length - 1];
      if (last && last.who === who) last.text += ` ${u.text}`;
      else lines.push({ who, text: u.text });
    }
    const text = lines.map(l => `${l.who}: ${l.text}`).join('\n');
    transcript = text.trim() ? text : null;
  } finally {
    // Never keep recordings. (If this fails, the daily cleanup job removes
    // any leftover recording, see cleanup.ts.)
    await deleteAudio(service, audio);
  }
  return { transcript, seconds };
}
