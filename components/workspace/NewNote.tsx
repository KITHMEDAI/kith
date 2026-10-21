'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square, Keyboard, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { useRealTimeTranscript } from '@/hooks/useRealTimeTranscript';
import { cn } from '@/lib/utils';

type TypeOpt = { key: string; label: string; hint: string };

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function NewNote({ firstName, fieldName, types, defaultType, consentAcked }: {
  firstName: string; fieldName: string; types: TypeOpt[]; defaultType: string; consentAcked: boolean;
}) {
  const router = useRouter();
  const [noteType, setNoteType] = useState(defaultType);
  const [custom, setCustom] = useState('');
  const [mode, setMode] = useState<'record' | 'type'>('record');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(consentAcked);
  const [askConsent, setAskConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const { segments, partialText, connectionStatus, connect, disconnect } = useRealTimeTranscript();
  const segRef = useRef(segments);
  useEffect(() => { segRef.current = segments; }, [segments]);
  const startedAt = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [recording]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [segments, partialText]);

  // Prefetch so the jump to the note feels instant.
  useEffect(() => { router.prefetch('/notes'); }, [router]);

  const visibleTypes = showAll ? types : types.slice(0, 8);
  const selected = types.find(t => t.key === noteType);

  const create = async (input: string, inputMode: 'typed' | 'recorded', duration?: number) => {
    if (noteType === 'custom' && !custom.trim()) { setError('Describe the note you want (Custom)'); return; }
    setSubmitting(true); setError('');
    const res = await fetch('/api/w/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, input_mode: inputMode, note_type: noteType, custom_instruction: custom, duration_seconds: duration }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setSubmitting(false); setError(j.error || 'Could not create the note'); return; }
    router.push(`/notes/${j.id}`);
  };

  const startRecording = async () => {
    if (!consent) { setAskConsent(true); return; }
    setStarting(true); setError('');
    try {
      const res = await fetch('/api/w/token');
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not start recording');
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()));
      startedAt.current = Date.now();
      setElapsed(0);
      await connect(j.token);
      setRecording(true);
    } catch (err) {
      setError((err as Error).name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it in your browser and try again.' : (err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const stopRecording = async () => {
    const duration = Math.round((Date.now() - startedAt.current) / 1000);
    disconnect();
    setRecording(false);
    await new Promise(r => setTimeout(r, 350)); // let the final words flush
    const transcript = segRef.current.map(s => `${s.speaker}: ${s.text}`).join('\n');
    if (transcript.split(/\s+/).length < 4) { setError('We didn\'t catch enough speech. Try again a little closer to the mic.'); return; }
    create(transcript, 'recorded', duration);
  };

  const acceptConsent = async () => {
    setConsent(true); setAskConsent(false);
    fetch('/api/w/consent', { method: 'POST' }).catch(() => {});
    setTimeout(startRecording, 0);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Hi {firstName}, what are we writing?</h1>
      <p className="mt-1 text-sm text-slate-500">Notes tuned for <b className="font-medium text-slate-700">{fieldName}</b>.</p>

      {/* Note type */}
      <section className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Note type</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {visibleTypes.map(t => (
            <button
              key={t.key}
              onClick={() => setNoteType(t.key)}
              disabled={recording || submitting}
              className={cn(
                'rounded-xl border p-3 text-left transition active:scale-[0.98]',
                noteType === t.key ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <span className="block text-sm font-medium leading-tight">{t.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-slate-500">{t.hint}</span>
            </button>
          ))}
        </div>
        {types.length > 8 && (
          <button onClick={() => setShowAll(s => !s)} className="mt-2 text-sm text-violet-700 hover:underline">
            {showAll ? 'Show fewer' : `Show all ${types.length} types`}
          </button>
        )}
        {noteType === 'custom' && (
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Describe the note you want, e.g. 'Weekly progress report for the client with risks and next steps'"
            className="mt-3 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          />
        )}
      </section>

      {/* Input */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1 text-sm">
          {(['record', 'type'] as const).map(m => (
            <button
              key={m}
              onClick={() => !recording && setMode(m)}
              className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition',
                mode === m ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-800')}
            >
              {m === 'record' ? <Mic className="h-4 w-4" /> : <Keyboard className="h-4 w-4" />}
              {m === 'record' ? 'Record' : 'Type or paste'}
            </button>
          ))}
        </div>

        {mode === 'record' ? (
          <div>
            {askConsent && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <p className="flex items-center gap-2 font-medium text-amber-900"><ShieldCheck className="h-4 w-4" /> Before you record</p>
                <p className="mt-1 text-amber-900/80">In Australia you generally need everyone&apos;s agreement to record a conversation. Confirm everyone being recorded has agreed.</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={acceptConsent} className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700">Everyone has agreed</button>
                  <button onClick={() => setAskConsent(false)} className="rounded-lg px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100">Cancel</button>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center py-4">
              {!recording ? (
                <button
                  onClick={startRecording}
                  disabled={starting || submitting}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 active:scale-95 disabled:opacity-60"
                  aria-label="Start recording"
                >
                  {starting || submitting ? <Loader2 className="h-8 w-8 animate-spin" /> : <Mic className="h-8 w-8" />}
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 active:scale-95"
                  aria-label="Stop and create note"
                >
                  <span className="absolute inset-0 animate-ping rounded-full bg-rose-400 opacity-30" />
                  <Square className="h-7 w-7 fill-current" />
                </button>
              )}
              <p className="mt-3 text-sm text-slate-500">
                {submitting ? 'Creating your note…'
                  : recording ? <>Recording <b className="tabular-nums text-slate-800">{mmss(elapsed)}</b>. Tap stop when you&apos;re done</>
                  : starting ? 'Starting microphone…'
                  : <>Tap to record your <b className="font-medium text-slate-700">{selected?.label.toLowerCase()}</b></>}
              </p>
              {recording && connectionStatus === 'reconnecting' && <p className="mt-1 text-xs text-amber-600">Reconnecting…</p>}
            </div>

            {(recording || segments.length > 0) && (
              <div ref={scrollRef} className="mt-2 max-h-56 overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                {segments.map((s, i) => <p key={i} className="mb-1">{s.text}</p>)}
                {partialText && <p className="italic text-slate-400">{partialText}</p>}
                {recording && !segments.length && !partialText && <p className="text-slate-400">Listening…</p>}
              </div>
            )}
          </div>
        ) : (
          <div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && text.trim()) create(text, 'typed'); }}
              placeholder="Type or paste rough notes. Shorthand is fine: 'met Sarah re level 3 slab, pour delayed to Thu due to rain, she to confirm pump booking…'"
              className="min-h-[200px] w-full resize-y rounded-xl border border-slate-300 p-3 text-sm leading-relaxed outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              autoFocus
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">Ctrl/⌘ + Enter to create</span>
              <button
                onClick={() => create(text, 'typed')}
                disabled={!text.trim() || submitting}
                className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Create note
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      </section>
    </div>
  );
}
