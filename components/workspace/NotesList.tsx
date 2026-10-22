'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mic, Keyboard, Loader2, AlertTriangle, Search, Plus } from 'lucide-react';
import { ASK_HANDOFF_KEY } from './AskPanel';

export type NoteRow = { id: string; title: string | null; summary: string | null; note_type: string; input_mode: string; status: string; created_at: string };

function fmt(d: string) {
  const date = new Date(d);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// Search runs through POST /api/w/search: the query is never put in the URL,
// so it can't end up in browser history, Vercel request logs or referrers.
export default function NotesList({ initial, typeLabels }: { initial: NoteRow[]; typeLabels: Record<string, string> }) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const clear = () => { setInput(''); setQuery(''); setResults(null); setError(''); };
  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) { clear(); return; }
    setBusy(true); setError('');
    const res = await fetch('/api/w/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(j.error || 'Search failed. Try again.'); return; }
    setQuery(q);
    setResults(j.notes ?? []);
  };
  const askInstead = () => {
    try { sessionStorage.setItem(ASK_HANDOFF_KEY, query); } catch { /* storage blocked */ }
    router.push('/ask');
  };

  const rows = results ?? initial;
  return (
    <>
      <form onSubmit={search} className="relative mt-4" role="search">
        {busy
          ? <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-violet-600" />
          : <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={200}
          placeholder="Search by meaning or keyword, e.g. 'pump booking delays'"
          aria-label="Search your notes"
          className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </form>
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
      {results && (
        <p className="mt-2 text-sm text-slate-500">
          {rows.length} result{rows.length === 1 ? '' : 's'} for &ldquo;{query}&rdquo;. <button onClick={clear} className="text-violet-700 hover:underline">Clear</button>
          {' '}· Want an answer instead? <button onClick={askInstead} className="text-violet-700 hover:underline">Ask your notes</button>
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {rows.map(n => (
          <li key={n.id}>
            <Link href={`/notes/${n.id}`} prefetch className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-sm active:scale-[0.995]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {n.status === 'processing' ? 'Writing note…' : n.status === 'failed' ? 'Note failed: tap to retry' : (n.title || 'Untitled note')}
                  </p>
                  {n.summary && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{n.summary}</p>}
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                    {n.input_mode === 'recorded' ? <Mic className="h-3 w-3" /> : <Keyboard className="h-3 w-3" />}
                    {typeLabels[n.note_type] ?? 'Note'}
                  </p>
                </div>
                <span className="flex flex-none items-center gap-1 text-xs text-slate-400">
                  {n.status === 'processing' && <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />}
                  {n.status === 'failed' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                  {fmt(n.created_at)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {!rows.length && !results && (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <p className="font-medium">No notes yet</p>
          <p className="mt-1 text-sm text-slate-500">Record a conversation or paste rough notes to create your first one.</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
            <Plus className="h-4 w-4" /> Create a note
          </Link>
        </div>
      )}
    </>
  );
}
