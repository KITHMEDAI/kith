'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, ArrowUp, FileText } from 'lucide-react';

type Source = { n: number; id: string; title: string; date: string };
type Turn = { q: string; a: string; sources: Source[]; done: boolean };

const SUGGESTIONS = [
  'What are my open action items?',
  'Summarise everything from this week',
  'What issues or risks came up recently?',
  'What did we decide last time?',
];

// A question handed over from Notes search travels in sessionStorage, never
// in the URL (keeps it out of history and request logs).
export const ASK_HANDOFF_KEY = 'ws-ask-question';

export default function AskPanel() {
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    setBusy(true);
    setTurns(t => [...t, { q, a: '', sources: [], done: false }]);
    const update = (patch: Partial<Turn>) => setTurns(t => t.map((x, i) => (i === t.length - 1 ? { ...x, ...patch } : x)));

    try {
      const res = await fetch('/api/w/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) });
      if (!res.ok || !res.body) { update({ a: (await res.json().catch(() => ({}))).error || 'Something went wrong.', done: true }); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let sources: Source[] | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        if (!sources) {
          const nl = buf.indexOf('\n');
          if (nl === -1) continue;
          try { sources = JSON.parse(buf.slice(8, nl)); } catch { sources = []; }
          buf = buf.slice(nl + 1);
          update({ sources: sources ?? [] });
        }
        update({ a: buf });
      }
      update({ done: true });
    } catch {
      update({ a: 'Connection lost. Try again.', done: true });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let q = '';
    try { q = sessionStorage.getItem(ASK_HANDOFF_KEY) ?? ''; sessionStorage.removeItem(ASK_HANDOFF_KEY); } catch { /* storage blocked */ }
    if (q && !asked.current) { asked.current = true; ask(q); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only the notes the answer actually cites; none for a "not in your notes" answer.
  const shown = (t: Turn) => {
    if (t.a.trim().startsWith("That isn't in your notes.")) return [];
    const cited = new Set(Array.from(t.a.matchAll(/\[(\d+)\]/g)).map(m => Number(m[1])));
    return t.sources.filter(s => cited.has(s.n));
  };

  // Inline: [n] citations become links to the source note; **bold** / *italic* render.
  const renderInline = (text: string, sources: Source[], keyBase: string) =>
    text.split(/(\[\d+\]|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, i) => {
      const key = `${keyBase}-${i}`;
      const m = part.match(/^\[(\d+)\]$/);
      const src = m && sources.find(s => s.n === Number(m[1]));
      if (src) return <Link key={key} href={`/notes/${src.id}`} className="mx-0.5 rounded bg-violet-100 px-1 text-xs font-semibold text-violet-800 hover:bg-violet-200">{m![1]}</Link>;
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
      if (/^\*[^*]+\*$/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>;
      return <span key={key}>{part}</span>;
    });

  // Block: bullets, numbered lines, headings and paragraphs.
  const renderAnswer = (text: string, sources: Source[]) =>
    text.split('\n').map((line, i) => {
      const t = line.trim();
      if (!t) return <div key={i} className="h-2" />;
      const bullet = t.match(/^[-•*]\s+(.*)$/);
      if (bullet) return <p key={i} className="flex gap-2 pl-1"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-violet-400" /><span>{renderInline(bullet[1], sources, `b${i}`)}</span></p>;
      const heading = t.match(/^#{1,4}\s+(.*)$/);
      if (heading) return <p key={i} className="mt-1 font-semibold">{renderInline(heading[1], sources, `h${i}`)}</p>;
      return <p key={i}>{renderInline(t, sources, `p${i}`)}</p>;
    });

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Sparkles className="h-5 w-5 text-violet-600" /> Ask your notes</h1>
      <p className="mt-1 text-sm text-slate-500">Answers come only from your notes, with links to the source.</p>

      {!turns.length && (
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => ask(s)} className="rounded-xl border border-slate-200 bg-white p-3 text-left text-sm transition hover:border-violet-300 active:scale-[0.99]">{s}</button>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-6">
        {turns.map((t, i) => (
          <div key={i}>
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2 text-sm text-white">{t.q}</p>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed shadow-sm">
              {t.a ? <div className="space-y-1">{renderAnswer(t.a, t.sources)}</div>
                : <span className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Searching your notes…</span>}
              {t.done && shown(t).length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {shown(t).map(s => (
                      <Link key={s.id} href={`/notes/${s.id}`} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs hover:border-violet-300">
                        <span className="font-semibold text-violet-700">{s.n}</span><FileText className="h-3 w-3 text-slate-400" />
                        <span className="max-w-[180px] truncate">{s.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={e => { e.preventDefault(); ask(input); }} className="sticky bottom-4 mt-6">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white p-1.5 shadow-lg focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask anything about your notes…"
            className="h-10 flex-1 bg-transparent px-3 text-sm outline-none"
            autoFocus
          />
          <button type="submit" disabled={!input.trim() || busy} className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-40" aria-label="Ask">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
