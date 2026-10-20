'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { startDeepgramStream, type StreamStatus } from '@/lib/copilot/deepgram-stream';
import { matchGlossary, matchRedLines } from '@/lib/copilot/rules';

const THEM = 'Steve';
const YOU = 'You';
const SUGGEST_DEBOUNCE_MS = 1200;   // wait for Steve to finish a multi-part question
const REDLINE_COOLDOWN_MS = 3 * 60 * 1000;
const MIN_WORDS_FOR_SUGGESTION = 5;

type Seg = { who: string; text: string; at: number };
type Card = { id: string; kind: 'suggest' | 'redline' | 'term' | 'ask'; title: string; body: string; at: number; streaming?: boolean };

const KIND_STYLE: Record<Card['kind'], string> = {
  suggest: 'border-sky-400/60 bg-sky-950/60',
  ask: 'border-violet-400/60 bg-violet-950/60',
  redline: 'border-rose-400/70 bg-rose-950/60',
  term: 'border-zinc-600 bg-zinc-900/70',
};
const KIND_ICON: Record<Card['kind'], string> = { suggest: '💬', ask: '🤖', redline: '🚨', term: '📖' };

const STATUS_DOT: Record<StreamStatus | 'off', string> = {
  off: 'bg-zinc-600', connecting: 'bg-amber-400', live: 'bg-emerald-400',
  reconnecting: 'bg-amber-400 animate-pulse', failed: 'bg-rose-500', stopped: 'bg-zinc-600',
};

function clock(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function CopilotClient() {
  const [segments, setSegments] = useState<Seg[]>([]);
  const [partial, setPartial] = useState<{ them: string; you: string }>({ them: '', you: '' });
  const [cards, setCards] = useState<Card[]>([]);
  const [themStatus, setThemStatus] = useState<StreamStatus | 'off'>('off');
  const [youStatus, setYouStatus] = useState<StreamStatus | 'off'>('off');
  const [running, setRunning] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [savedTo, setSavedTo] = useState('');

  const segmentsRef = useRef<Seg[]>([]);
  const stopFns = useRef<Array<() => void>>([]);
  const seenTerms = useRef<Set<string>>(new Set());
  const redlineLast = useRef<Record<string, number>>({});
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<AbortController | null>(null);
  const startedAt = useRef<string>('');
  const transcriptEnd = useRef<HTMLDivElement | null>(null);
  const cardSeq = useRef(0);

  useEffect(() => { transcriptEnd.current?.scrollIntoView({ block: 'end' }); }, [segments, partial]);

  // Warm every route on load so nothing compiles mid-call (dev server compiles lazily).
  useEffect(() => {
    fetch('/api/copilot/token').catch(() => {});
    fetch('/api/copilot/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ warm: true }) }).catch(() => {});
    fetch('/api/copilot/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
  }, []);

  const pushCard = useCallback((c: Omit<Card, 'id' | 'at'> & { id?: string }) => {
    const id = c.id || `c${++cardSeq.current}`;
    setCards(prev => [{ ...c, id, at: Date.now() }, ...prev].slice(0, 40));
    return id;
  }, []);

  const patchCard = useCallback((id: string, patch: Partial<Card>) => {
    setCards(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const removeCard = useCallback((id: string) => setCards(prev => prev.filter(c => c.id !== id)), []);

  // ── AI suggestion (streams into a card; "SKIP" removes it) ────────────────
  const requestSuggestion = useCallback(async (ask?: string) => {
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    const id = pushCard({
      kind: ask ? 'ask' : 'suggest',
      title: ask ? `You asked: ${ask}` : 'Suggested response',
      body: '',
      streaming: true,
    });
    try {
      const res = await fetch('/api/copilot/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: segmentsRef.current.slice(-24).map(s => ({ who: s.who, text: s.text })), ask }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        patchCard(id, { body: `⚠ ${await res.text()}`, streaming: false });
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let text = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        if (!ask && /^\s*SKIP/.test(text)) { removeCard(id); ctrl.abort(); return; }
        patchCard(id, { body: text });
      }
      patchCard(id, { streaming: false });
    } catch (err) {
      if ((err as Error).name === 'AbortError') removeCard(id);
      else patchCard(id, { body: `⚠ ${(err as Error).message}`, streaming: false });
    }
  }, [pushCard, patchCard, removeCard]);

  // ── New finished utterance from either side ───────────────────────────────
  const onUtterance = useCallback((who: string, text: string) => {
    const seg = { who, text, at: Date.now() };
    segmentsRef.current = [...segmentsRef.current, seg];
    setSegments(segmentsRef.current);
    if (who !== THEM) return;

    for (const g of matchGlossary(text)) {
      if (seenTerms.current.has(g.term)) continue;
      seenTerms.current.add(g.term);
      pushCard({ kind: 'term', title: g.term, body: g.def });
    }
    const now = Date.now();
    for (const r of matchRedLines(text)) {
      if (now - (redlineLast.current[r.id] || 0) < REDLINE_COOLDOWN_MS) continue;
      redlineLast.current[r.id] = now;
      pushCard({ kind: 'redline', title: 'Our position', body: r.say });
    }

    if (debounce.current) clearTimeout(debounce.current);
    const recentThem = segmentsRef.current.filter(s => s.who === THEM).slice(-3).map(s => s.text).join(' ');
    if (recentThem.split(/\s+/).length < MIN_WORDS_FOR_SUGGESTION) return;
    debounce.current = setTimeout(() => requestSuggestion(), SUGGEST_DEBOUNCE_MS);
  }, [pushCard, requestSuggestion]);

  // ── Start / stop ─────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    setError('');
    setSavedTo('');
    try {
      const tokRes = await fetch('/api/copilot/token');
      const tok = await tokRes.json();
      if (!tokRes.ok) throw new Error(tok.error || 'Could not get Deepgram token');

      // Meet tab audio = Steve. Chrome needs video:true to offer tab sharing.
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        // Chrome-only hints: list tabs first, keep the tab audible for you.
        ...({ preferCurrentTab: false, selfBrowserSurface: 'exclude', suppressLocalAudioPlayback: false } as object),
      } as DisplayMediaStreamOptions);
      if (!display.getAudioTracks().length) {
        display.getTracks().forEach(t => t.stop());
        throw new Error('No tab audio. Pick the Google Meet TAB and tick "Also share tab audio".');
      }
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      startedAt.current = new Date().toISOString();
      const stopThem = startDeepgramStream({
        token: tok.token, media: display,
        onPartial: t => setPartial(p => ({ ...p, them: t })),
        onUtterance: t => onUtterance(THEM, t),
        onStatus: setThemStatus,
      });
      const stopYou = startDeepgramStream({
        token: tok.token, media: mic,
        onPartial: t => setPartial(p => ({ ...p, you: t })),
        onUtterance: t => onUtterance(YOU, t),
        onStatus: setYouStatus,
      });
      stopFns.current = [stopThem, stopYou];
      // If the share is ended from Chrome's "Stop sharing" bar, stop cleanly too.
      display.getVideoTracks()[0]?.addEventListener('ended', () => stopRef.current());
      setRunning(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [onUtterance]);

  // Real audio path test without a call: plays a synthesized "Steve" clip and
  // feeds the element's own stream through exactly the same Deepgram pipeline.
  const testWithSample = useCallback(async () => {
    setError('');
    try {
      const tokRes = await fetch('/api/copilot/token');
      const tok = await tokRes.json();
      if (!tokRes.ok) throw new Error(tok.error || 'Could not get Deepgram token');
      const audio = new Audio('/api/copilot/test-audio');
      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => reject(new Error('Test clip failed to load'));
      });
      await audio.play();
      const media: MediaStream = (audio as HTMLAudioElement & { captureStream(): MediaStream }).captureStream();
      const stopSample = startDeepgramStream({
        token: tok.token, media,
        onPartial: t => setPartial(p => ({ ...p, them: t })),
        onUtterance: t => onUtterance(THEM, t),
        onStatus: setThemStatus,
      });
      // Give Deepgram a moment to finalise the last words after the clip ends.
      audio.onended = () => setTimeout(stopSample, 2500);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [onUtterance]);

  const save = useCallback(async () => {
    if (!segmentsRef.current.length) return;
    const md = `# Call transcript: ${THEM}, ${new Date(startedAt.current || Date.now()).toString()}\n\n` +
      `_Private notes. Do not share or publish._\n\n` +
      segmentsRef.current.map(s => `**${clock(s.at)} ${s.who}:** ${s.text}`).join('\n\n') + '\n';
    const res = await fetch('/api/copilot/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: md, startedAt: startedAt.current }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setSavedTo(j.saved);
    else setError(j.error || 'Save failed');
  }, []);

  const stop = useCallback(() => {
    stopFns.current.forEach(fn => fn());
    stopFns.current = [];
    inflight.current?.abort();
    if (debounce.current) clearTimeout(debounce.current);
    setRunning(false);
    setPartial({ them: '', you: '' });
    save();
  }, [save]);

  const stopRef = useRef(stop);
  useEffect(() => { stopRef.current = stop; }, [stop]);

  // Autosave every 2 minutes while running, so a crash never loses the call.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(save, 120_000);
    return () => clearInterval(t);
  }, [running, save]);

  const submit = (mode: 'them' | 'ask') => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    if (mode === 'them') onUtterance(THEM, text);
    else requestSuggestion(text);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-zinc-800 px-4 py-2">
        <span className="font-semibold tracking-wide">Call copilot</span>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[themStatus]}`} />{THEM} (tab)
        </span>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[youStatus]}`} />{YOU} (mic)
        </span>
        <div className="ml-auto flex items-center gap-2">
          {savedTo && <span className="text-xs text-emerald-400">Saved → {savedTo}</span>}
          {running ? (
            <button onClick={stop} className="rounded bg-rose-600 px-3 py-1.5 text-sm font-medium hover:bg-rose-500">Stop &amp; save</button>
          ) : (
            <button onClick={start} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500">Start listening</button>
          )}
          {!running && (
            <button onClick={testWithSample} className="rounded border border-amber-500/60 px-3 py-1.5 text-sm">Test with sample audio</button>
          )}
          <button onClick={save} disabled={!segments.length} className="rounded border border-zinc-700 px-3 py-1.5 text-sm disabled:opacity-40">Save now</button>
          <button onClick={() => setCards([])} className="rounded border border-zinc-700 px-3 py-1.5 text-sm">Clear cards</button>
        </div>
      </header>

      {error && <div className="bg-rose-900/60 px-4 py-2 text-sm">{error}</div>}
      {!running && !segments.length && (
        <div className="px-4 py-3 text-sm text-zinc-400 border-b border-zinc-800">
          Wear headphones. Click <b>Start listening</b>, choose the <b>Google Meet tab</b>, tick <b>Also share tab audio</b>, then allow the mic.
          Test without audio using the box at the bottom.
        </div>
      )}

      <main className="flex flex-1 min-h-0">
        <section className="w-2/5 min-w-[260px] overflow-y-auto border-r border-zinc-800 p-3 text-sm leading-relaxed">
          {segments.map((s, i) => (
            <p key={i} className="mb-2">
              <span className={s.who === THEM ? 'font-semibold text-amber-300' : 'font-semibold text-sky-300'}>{s.who}:</span>{' '}
              <span className="text-zinc-300">{s.text}</span>
            </p>
          ))}
          {partial.them && <p className="mb-2 italic text-zinc-500"><span className="text-amber-300/70">{THEM}:</span> {partial.them}</p>}
          {partial.you && <p className="mb-2 italic text-zinc-500"><span className="text-sky-300/70">{YOU}:</span> {partial.you}</p>}
          <div ref={transcriptEnd} />
        </section>

        <section className="flex-1 overflow-y-auto p-3 space-y-2">
          {cards.map(c => (
            <div key={c.id} onClick={() => removeCard(c.id)} title="Click to dismiss"
              className={`cursor-pointer rounded-lg border p-3 ${KIND_STYLE[c.kind]}`}>
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                <span>{KIND_ICON[c.kind]} {c.title}</span>
                <span>{clock(c.at)}</span>
              </div>
              <div className={`whitespace-pre-wrap ${c.kind === 'term' ? 'text-base' : 'text-lg leading-snug'}`}>
                {c.body.replace(/\*\*|__/g, '') || (c.streaming ? '…' : '')}
              </div>
            </div>
          ))}
        </section>
      </main>

      <footer className="flex gap-2 border-t border-zinc-800 p-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(e.shiftKey ? 'them' : 'ask'); }}
          placeholder={`Ask the copilot privately (Enter), or simulate ${THEM} speaking (Shift+Enter)`}
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <button onClick={() => submit('them')} className="rounded border border-amber-500/60 px-3 text-sm">{THEM} says</button>
        <button onClick={() => submit('ask')} className="rounded border border-violet-500/60 px-3 text-sm">Ask</button>
      </footer>
    </div>
  );
}
