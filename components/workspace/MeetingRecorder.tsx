'use client';

import { useEffect, useRef, useState } from 'react';
import { MonitorSpeaker, Square, Loader2, Info } from 'lucide-react';
import { startDeepgramStream, type StreamStatus } from '@/lib/copilot/deepgram-stream';
import { startCapture, uploadTrack, type Capture } from '@/lib/workspace/audio-capture';

// Records an online meeting (Google Meet / Teams / Zoom in the browser) with
// no bot: the meeting tab's audio = everyone else, the microphone = you. Two
// separate live transcription streams, so "who said what" is reliable; other
// participants are separated by voice within the tab stream.

type Seg = { who: string; text: string; at: number };

/** Short-lived Deepgram token for the recorder (never the account key). */
async function freshToken(): Promise<string> {
  const r = await fetch('/api/w/token', { cache: 'no-store' });
  const j = await r.json();
  if (!r.ok || !j.token) throw new Error(j.error || 'Could not start transcription');
  return j.token as string;
}


function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function meetingSupported() {
  if (typeof navigator === 'undefined') return false;
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return !mobile && !!navigator.mediaDevices?.getDisplayMedia;
}

export default function MeetingRecorder({ youName, disabled, ensureConsent, onDone }: {
  youName: string;
  disabled: boolean;
  /** Returns true when the user has confirmed everyone agreed to be recorded. */
  ensureConsent: () => boolean;
  onDone: (transcript: string, durationSec: number, audio: Array<{ track: 'room' | 'tab' | 'mic'; path: string }>) => void;
}) {
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [segments, setSegments] = useState<Seg[]>([]);
  const [partial, setPartial] = useState<{ them: string; you: string }>({ them: '', you: '' });
  const [status, setStatus] = useState<{ them: StreamStatus | 'off'; you: StreamStatus | 'off' }>({ them: 'off', you: 'off' });
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  const segRef = useRef<Seg[]>([]);
  const stops = useRef<Array<() => Promise<void>>>([]);
  const captures = useRef<{ tab: Capture | null; mic: Capture | null }>({ tab: null, mic: null });
  const startedAt = useRef(0);
  const stoppingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supported = meetingSupported();

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [segments, partial]);

  const add = (who: string, text: string) => {
    segRef.current = [...segRef.current, { who, text, at: Date.now() }];
    setSegments(segRef.current);
  };

  const start = async () => {
    if (!ensureConsent()) return;
    setError(''); setStarting(true);
    try {
      const res = await fetch('/api/w/token');
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not start recording');

      // Chrome needs video:true to list tabs; we only use the audio.
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        ...({ preferCurrentTab: false, selfBrowserSurface: 'exclude', suppressLocalAudioPlayback: false, systemAudio: 'include' } as object),
      } as DisplayMediaStreamOptions);
      if (!display.getAudioTracks().length) {
        display.getTracks().forEach(t => t.stop());
        throw new Error('No meeting audio was shared. Choose the meeting TAB and tick "Also share tab audio".');
      }
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });

      captures.current = { tab: startCapture(display), mic: startCapture(mic) }; // audio for the polish pass
      segRef.current = []; setSegments([]);
      startedAt.current = Date.now(); setElapsed(0);
      const stopThem = startDeepgramStream({
        token: j.token, scheme: 'bearer', refreshToken: freshToken, media: display, diarize: true,
        onPartial: t => setPartial(p => ({ ...p, them: t })),
        onUtterance: (t, spk) => add(`Participant ${typeof spk === 'number' ? spk + 1 : 1}`, t),
        onStatus: s => setStatus(p => ({ ...p, them: s })),
      });
      const stopYou = startDeepgramStream({
        token: j.token, scheme: 'bearer', refreshToken: freshToken, media: mic,
        onPartial: t => setPartial(p => ({ ...p, you: t })),
        onUtterance: t => add(`${youName} (me)`, t),
        onStatus: s => setStatus(p => ({ ...p, you: s })),
      });
      stops.current = [stopThem, stopYou];
      // Ending the share from Chrome's "Stop sharing" bar finishes the note too.
      display.getVideoTracks()[0]?.addEventListener('ended', () => { stop(); });
      setRunning(true);
    } catch (err) {
      const e = err as Error;
      setError(e.name === 'NotAllowedError' ? 'Sharing or microphone access was cancelled.' : e.message);
    } finally {
      setStarting(false);
    }
  };

  const stop = async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    setStopping(true);
    const duration = Math.round((Date.now() - startedAt.current) / 1000);
    const blobs = Promise.all([captures.current.tab?.stop() ?? null, captures.current.mic?.stop() ?? null]);
    captures.current = { tab: null, mic: null };
    await Promise.all(stops.current.map(fn => fn()));
    const [tabBlob, micBlob] = await blobs;
    stops.current = [];
    setRunning(false); setStopping(false); stoppingRef.current = false;
    setPartial({ them: '', you: '' });
    const transcript = segRef.current.map(s => `${s.who}: ${s.text}`).join('\n');
    if (transcript.split(/\s+/).length < 6) {
      setError("We didn't catch enough of the meeting. Check you shared the meeting tab with audio, then try again.");
      return;
    }
    setUploading(true);
    const refs = (await Promise.all([uploadTrack(tabBlob, 'tab'), uploadTrack(micBlob, 'mic')])).filter(Boolean) as Array<{ track: 'tab' | 'mic'; path: string }>;
    setUploading(false);
    onDone(transcript, duration, refs);
  };

  if (!supported) {
    return (
      <div className="flex gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <Info className="mt-0.5 h-4 w-4 flex-none" />
        Meeting recording works in Chrome or Edge on a computer. On a phone, put the call on speaker and use <b>Record</b>.
      </div>
    );
  }

  const dot = (s: StreamStatus | 'off') =>
    s === 'live' ? 'bg-emerald-500' : s === 'connecting' || s === 'reconnecting' ? 'bg-amber-400 animate-pulse' : s === 'failed' ? 'bg-rose-500' : 'bg-slate-300';

  return (
    <div>
      {!running && (
        <ol className="mb-4 space-y-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <li>1. Join your meeting (Google Meet, Teams or Zoom) <b>in this browser</b>, in another tab.</li>
          <li>2. Tap <b>Start</b>, choose the <b>meeting tab</b>, and tick <b>&ldquo;Also share tab audio&rdquo;</b>.</li>
          <li>3. Allow the microphone so your own voice is included. Headphones give the cleanest result.</li>
        </ol>
      )}

      <div className="flex flex-col items-center py-2">
        {!running ? (
          <button onClick={start} disabled={disabled || starting}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 active:scale-95 disabled:opacity-60"
            aria-label="Start recording the meeting">
            {starting || disabled ? <Loader2 className="h-8 w-8 animate-spin" /> : <MonitorSpeaker className="h-8 w-8" />}
          </button>
        ) : (
          <button onClick={stop} disabled={stopping}
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 active:scale-95"
            aria-label="Stop and create note">
            <span className="absolute inset-0 animate-ping rounded-full bg-rose-400 opacity-30" />
            {stopping ? <Loader2 className="h-7 w-7 animate-spin" /> : <Square className="h-7 w-7 fill-current" />}
          </button>
        )}
        <p className="mt-3 text-sm text-slate-500">
          {disabled ? 'Creating your note…'
            : stopping ? 'Finishing the transcript…'
            : uploading ? 'Uploading audio for the most accurate transcript…'
            : running ? <>Recording meeting <b className="tabular-nums text-slate-800">{mmss(elapsed)}</b>. Tap stop when it ends</>
            : starting ? 'Waiting for you to choose the meeting tab…'
            : 'Tap to start recording the meeting'}
        </p>
        {running && (
          <div className="mt-2 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${dot(status.them)}`} />Meeting audio</span>
            <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${dot(status.you)}`} />Your mic</span>
          </div>
        )}
      </div>

      {(running || segments.length > 0) && (
        <div ref={scrollRef} className="mt-3 max-h-56 overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          {segments.map((s, i) => (
            <p key={i} className="mb-1"><span className={s.who.endsWith('(me)') ? 'font-medium text-violet-700' : 'font-medium text-amber-700'}>{s.who}:</span> {s.text}</p>
          ))}
          {partial.them && <p className="italic text-slate-400">{partial.them}</p>}
          {partial.you && <p className="italic text-slate-400">{partial.you}</p>}
          {running && !segments.length && !partial.them && !partial.you && <p className="text-slate-400">Listening to the meeting…</p>}
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
