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
import { keytermsForField } from './keyterms';

export type AudioTrack = 'room' | 'tab' | 'mic';
export interface AudioRef { track: AudioTrack; path: string }

type Utt = { start: number; end: number; speaker: number; text: string; track: AudioTrack };

const BUCKET = 'ws-audio';

export function parseAudioPaths(raw: string[] | null | undefined): AudioRef[] {
  return (raw ?? []).map(s => {
    const i = s.indexOf(':');
    return { track: s.slice(0, i) as AudioTrack, path: s.slice(i + 1) };
  }).filter(a => ['room', 'tab', 'mic'].includes(a.track) && a.path);
}

async function transcribeFile(url: string, track: AudioTrack, keyterms: string[]): Promise<Utt[]> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error('DEEPGRAM_API_KEY missing');
  const qs = new URLSearchParams({
    model: 'nova-3', language: 'en', smart_format: 'true', punctuate: 'true',
    utterances: 'true', utt_split: '0.8', diarize: track === 'mic' ? 'false' : 'true',
  });
  keyterms.slice(0, 40).forEach(k => qs.append('keyterm', k));
  const res = await fetch(`https://api.deepgram.com/v1/listen?${qs}`, {
    method: 'POST',
    headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Deepgram ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json() as { results?: { utterances?: Array<{ start: number; end: number; speaker?: number; transcript: string }> } };
  return (j.results?.utterances ?? [])
    .filter(u => u.transcript?.trim())
    .map(u => ({ start: u.start, end: u.end, speaker: u.speaker ?? 0, text: u.transcript.trim(), track }));
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
 * Returns the polished transcript ("Label: text" lines in time order), or null
 * if nothing usable came back. Always deletes the audio files afterwards.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function polishTranscript(service: any, audio: AudioRef[], field: string, youName: string): Promise<string | null> {
  try {
    const keyterms = keytermsForField(field);
    const perTrack = await Promise.all(audio.map(async a => {
      const { data, error } = await service.storage.from(BUCKET).createSignedUrl(a.path, 900);
      if (error || !data?.signedUrl) throw new Error(`signed url: ${error?.message}`);
      return transcribeFile(data.signedUrl, a.track, keyterms);
    }));
    let all = perTrack.flat();
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
    const transcript = lines.map(l => `${l.who}: ${l.text}`).join('\n');
    return transcript.trim() ? transcript : null;
  } finally {
    // Never keep recordings.
    await service.storage.from(BUCKET).remove(audio.map(a => a.path)).catch(() => {});
  }
}
