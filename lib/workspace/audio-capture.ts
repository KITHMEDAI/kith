'use client';

/**
 * lib/workspace/audio-capture.ts
 *
 * Keeps a compressed copy (Opus, ~32 kbps ≈ 15 MB/hour) of a recording's
 * audio in the browser while the live transcript runs, then uploads it to the
 * private bucket for the server's "polish pass". Never blocks the note: if
 * anything here fails, the live transcript is used instead.
 */
import { createClient } from '@/lib/supabase/client';
import type { AudioTrack } from './polish';

export interface Capture { stop: () => Promise<Blob | null> }

export function startCapture(stream: MediaStream): Capture | null {
  try {
    if (typeof MediaRecorder === 'undefined') return null;
    const audioOnly = new MediaStream(stream.getAudioTracks());
    if (!audioOnly.getAudioTracks().length) return null;
    const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(audioOnly, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.start(5000); // flush a chunk every 5 s so a crash loses little
    return {
      stop: () => new Promise<Blob | null>(resolve => {
        if (rec.state === 'inactive') { resolve(chunks.length ? new Blob(chunks, { type: rec.mimeType }) : null); return; }
        rec.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: rec.mimeType || 'audio/webm' }) : null);
        try { rec.stop(); } catch { resolve(null); }
      }),
    };
  } catch {
    return null;
  }
}

/** Uploads one track; returns its reference for the notes API, or null on failure. */
export async function uploadTrack(blob: Blob | null, track: AudioTrack): Promise<{ track: AudioTrack; path: string } | null> {
  if (!blob || blob.size < 2000) return null;
  try {
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const r = await fetch('/api/w/audio/upload-url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ext }),
    });
    const j = await r.json();
    if (!r.ok || !j.path || !j.token) return null;
    const { error } = await createClient().storage.from('ws-audio').uploadToSignedUrl(j.path, j.token, blob, {
      contentType: blob.type.split(';')[0] || 'audio/webm',
    });
    return error ? null : { track, path: j.path };
  } catch {
    return null;
  }
}
