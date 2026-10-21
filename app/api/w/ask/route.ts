import { NextResponse } from 'next/server';
import { requireApiUser, embedQueryFast } from '@/lib/workspace/server';
import { anthropic, SONNET } from '@/lib/claude';

export const maxDuration = 60;

// "Ask your notes": retrieve the most relevant notes (hybrid semantic +
// keyword; keyword-only if embeddings are slow; recent notes as a last
// resort), then stream an answer that cites them as [1], [2]…
//
// Stream format: first line `SOURCES <json>`, then the answer text.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const { question } = await req.json().catch(() => ({})) as { question?: string };
  const q = String(question ?? '').trim().slice(0, 500);
  if (!q) return NextResponse.json({ error: 'Ask a question' }, { status: 422 });

  const client = anthropic();
  if (!client) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  // ── Retrieve ──────────────────────────────────────────────────────────
  let ids: string[] = [];
  const vector = await embedQueryFast(q);
  if (vector) {
    const { data } = await supabase.rpc('ws_search_notes', {
      p_user_id: user.id, p_query_embedding: JSON.stringify(vector), p_query_text: q, p_limit: 8,
    });
    ids = (data ?? []).map((r: { id: string }) => r.id);
  }
  if (!ids.length) {
    const { data } = await supabase.rpc('ws_keyword_notes', { p_user_id: user.id, p_query_text: q, p_limit: 8 });
    ids = (data ?? []).map((r: { id: string }) => r.id);
  }

  // Index of recent notes so "how many / list / latest" questions work too.
  const { data: recent } = await supabase.from('ws_notes')
    .select('id, title, note_type, created_at, search_text')
    .eq('status', 'completed').order('created_at', { ascending: false }).limit(40);
  const recentRows = recent ?? [];
  if (!ids.length) ids = recentRows.slice(0, 6).map(r => r.id);

  const byId = new Map(recentRows.map(r => [r.id, r]));
  const missing = ids.filter(id => !byId.has(id));
  if (missing.length) {
    const { data } = await supabase.from('ws_notes')
      .select('id, title, note_type, created_at, search_text').in('id', missing);
    (data ?? []).forEach(r => byId.set(r.id, r));
  }
  const sources = ids.map(id => byId.get(id)).filter(Boolean) as typeof recentRows;

  if (!sources.length) {
    return new Response(`SOURCES []\nYou don't have any notes yet. Create one and ask again.`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  const context = sources.map((s, i) =>
    `[${i + 1}] ${s.title || 'Untitled'} (${fmt(s.created_at)})\n${(s.search_text || '').slice(0, 3500)}`).join('\n\n---\n\n');
  const index = recentRows.map(r => `- ${fmt(r.created_at)}: ${r.title || 'Untitled'}`).join('\n');

  const stream = client.messages.stream({
    model: SONNET,
    max_tokens: 900,
    system: `You answer questions about the user's own notes. Use ONLY the notes provided. Cite sources inline as [1], [2] matching the numbered notes. If the notes don't contain the answer, say so plainly and suggest what to search for. Be concise: short paragraphs or bullets. Never invent facts, names, dates or numbers. Australian English.`,
    messages: [{
      role: 'user',
      content: `Most relevant notes:\n\n${context}\n\nIndex of the user's recent notes (titles only, for counting/listing questions):\n${index}\n\nQuestion: ${q}`,
    }],
  });

  const meta = sources.map((s, i) => ({ n: i + 1, id: s.id, title: s.title || 'Untitled', date: s.created_at }));
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      controller.enqueue(enc.encode(`SOURCES ${JSON.stringify(meta)}\n`));
      try {
        for await (const ev of stream) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') controller.enqueue(enc.encode(ev.delta.text));
        }
      } catch (err) {
        controller.enqueue(enc.encode(`\n\n(Sorry, something went wrong: ${(err as Error).message})`));
      } finally {
        controller.close();
      }
    },
    cancel() { stream.abort(); },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
