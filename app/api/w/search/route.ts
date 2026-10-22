import { NextResponse } from 'next/server';
import { requireApiUser, embedQueryFast } from '@/lib/workspace/server';
import { rateHit, LIMITS } from '@/lib/workspace/rate';
import { blindQuery } from '@/lib/workspace/crypto';
import { openNote } from '@/lib/workspace/note-fields';

// Note search. A POST body, never a ?q= URL, so what people search for
// ("John pressure injury") stays out of URLs, browser history and request logs.
const COLS = 'id, title, summary, note_type, input_mode, status, created_at';

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;
  const { q: raw } = await req.json().catch(() => ({})) as { q?: string };
  const q = String(raw ?? '').trim().slice(0, 200);
  if (!q) return NextResponse.json({ notes: [] });

  // Semantic search costs an embedding call: over the limit, keyword only.
  const vector = (await rateHit(`ws-search:${user.id}`, LIMITS.search)) ? null : await embedQueryFast(q);
  const { data: ranked } = vector
    ? await supabase.rpc('ws_search_notes', { p_user_id: user.id, p_query_embedding: JSON.stringify(vector), p_query_text: blindQuery(q, 'and'), p_limit: 30 })
    : await supabase.rpc('ws_keyword_notes', { p_user_id: user.id, p_query_text: blindQuery(q, 'and'), p_limit: 30 });
  const ids: string[] = (ranked ?? []).map((r: { id: string }) => r.id);
  if (!ids.length) return NextResponse.json({ notes: [] }, { headers: { 'Cache-Control': 'no-store' } });

  const { data } = await supabase.from('ws_notes').select(COLS).eq('user_id', user.id).in('id', ids);
  const byId = new Map((data ?? []).map(r => [r.id, openNote(r)]));
  const notes = ids.map(id => byId.get(id)).filter(Boolean);
  return NextResponse.json({ notes }, { headers: { 'Cache-Control': 'no-store' } });
}
