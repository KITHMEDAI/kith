import Link from 'next/link';
import { Mic, Keyboard, Loader2, AlertTriangle, Search, Plus } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { embedQueryFast, requirePageProfile } from '@/lib/workspace/server';
import { rateHit, LIMITS } from '@/lib/workspace/rate';
import { NOTE_TYPE_MAP } from '@/lib/workspace/note-types';

export const metadata = { title: 'Notes' };

type Row = { id: string; title: string | null; summary: string | null; note_type: string; input_mode: string; status: string; created_at: string };
const COLS = 'id, title, summary, note_type, input_mode, status, created_at';

function fmt(d: string) {
  const date = new Date(d);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export default async function NotesPage({ searchParams }: { searchParams: { q?: string } }) {
  const { userId } = await requirePageProfile();
  const supabase = createServerSupabaseClient();
  const q = (searchParams.q ?? '').trim().slice(0, 200);
  let rows: Row[] = [];

  if (q) {
    // Semantic search costs an embedding call: over the limit, keyword only.
    const vector = (await rateHit(`ws-search:${userId}`, LIMITS.search)) ? null : await embedQueryFast(q);
    const { data: ranked } = vector
      ? await supabase.rpc('ws_search_notes', { p_user_id: userId, p_query_embedding: JSON.stringify(vector), p_query_text: q, p_limit: 30 })
      : await supabase.rpc('ws_keyword_notes', { p_user_id: userId, p_query_text: q, p_limit: 30 });
    const ids: string[] = (ranked ?? []).map((r: { id: string }) => r.id);
    if (ids.length) {
      const { data } = await supabase.from('ws_notes').select(COLS).in('id', ids);
      const byId = new Map((data ?? []).map(r => [r.id, r as Row]));
      rows = ids.map(id => byId.get(id)).filter(Boolean) as Row[];
    }
  } else {
    const { data } = await supabase.from('ws_notes').select(COLS).order('created_at', { ascending: false }).limit(200);
    rows = (data ?? []) as Row[];
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        <Link href="/" className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
          <Plus className="h-4 w-4" /> New
        </Link>
      </div>

      <form action="/notes" className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by meaning or keyword, e.g. 'pump booking delays'"
          className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </form>
      {q && (
        <p className="mt-2 text-sm text-slate-500">
          {rows.length} result{rows.length === 1 ? '' : 's'} for &ldquo;{q}&rdquo;. <Link href="/notes" className="text-violet-700 hover:underline">Clear</Link>
          {' '}· Want an answer instead? <Link href={`/ask?q=${encodeURIComponent(q)}`} className="text-violet-700 hover:underline">Ask your notes</Link>
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
                    {NOTE_TYPE_MAP[n.note_type]?.label ?? 'Note'}
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

      {!rows.length && !q && (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <p className="font-medium">No notes yet</p>
          <p className="mt-1 text-sm text-slate-500">Record a conversation or paste rough notes to create your first one.</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
            <Plus className="h-4 w-4" /> Create a note
          </Link>
        </div>
      )}
    </div>
  );
}
