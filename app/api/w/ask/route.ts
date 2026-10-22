import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/workspace/server';
import { limited, LIMITS } from '@/lib/workspace/rate';
import { retrieveForAsk, buildAskMessages, streamAnswer, NOT_IN_NOTES } from '@/lib/workspace/ask';

export const maxDuration = 60;

// "Ask your notes" — see lib/workspace/ask.ts for retrieval and the strict
// answer-only-from-notes rules (shared with the eval harness).
// Stream format: first line `SOURCES <json>`, then the answer text.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const { question } = await req.json().catch(() => ({})) as { question?: string };
  const q = String(question ?? '').trim().slice(0, 500);
  if (!q) return NextResponse.json({ error: 'Ask a question' }, { status: 422 });
  const tooMany = await limited(`ws-ask:${user.id}`, LIMITS.ask, 'You have asked a lot of questions recently. Try again a bit later.');
  if (tooMany) return tooMany;

  const { sources, recentRows } = await retrieveForAsk(supabase, user.id, q);
  if (!sources.length) {
    return new Response(`SOURCES []\n${NOT_IN_NOTES}\nYou don't have any notes yet. Create one and ask again.`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const { meta, user: prompt } = buildAskMessages(q, sources, recentRows);
  let stream: ReturnType<typeof streamAnswer>;
  try { stream = streamAnswer(prompt); } catch { return NextResponse.json({ error: 'AI not configured' }, { status: 500 }); }

  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      controller.enqueue(enc.encode(`SOURCES ${JSON.stringify(meta)}\n`));
      try {
        for await (const ev of stream) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') controller.enqueue(enc.encode(ev.delta.text));
        }
      } catch (err) {
        console.warn('[workspace] ask stream failed:', (err as Error).message.slice(0, 200));
        controller.enqueue(enc.encode('\n\n(Sorry, something went wrong. Try asking again.)'));
      } finally {
        controller.close();
      }
    },
    cancel() { stream.abort(); },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
