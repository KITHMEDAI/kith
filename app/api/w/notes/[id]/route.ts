import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireApiUser, indexNote, processNote } from '@/lib/workspace/server';
import { noteToText, type NoteContent } from '@/lib/workspace/generate';

export const maxDuration = 300;

// A note still 'processing' after this long was lost (e.g. a function timeout):
// surface it as failed so the user can retry instead of waiting forever.
const STUCK_AFTER_MS = 5 * 60 * 1000;

const COLS = 'id, title, note_type, field, input_mode, status, content, summary, error, duration_seconds, created_at, updated_at';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { data } = await auth.supabase.from('ws_notes').select(COLS).eq('id', params.id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (data.status === 'processing' && Date.now() - new Date(data.updated_at).getTime() > STUCK_AFTER_MS) {
    await auth.supabase.from('ws_notes').update({ status: 'failed', error: 'Timed out' }).eq('id', params.id).eq('status', 'processing');
    data.status = 'failed';
  }
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

// Save the user's edits. The before/after pair becomes a style example for
// future notes of the same type.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;
  const body = await req.json().catch(() => ({})) as { content?: NoteContent };
  if (!body.content || typeof body.content !== 'object') return NextResponse.json({ error: 'Missing content' }, { status: 422 });

  const { data: note } = await supabase.from('ws_notes').select('content, note_type').eq('id', params.id).maybeSingle();
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const before = note.content ? noteToText(note.content as NoteContent) : '';
  const after = noteToText(body.content);
  const { error } = await supabase.from('ws_notes').update({
    content: body.content, title: body.content.title, summary: body.content.summary,
    search_text: after, updated_at: new Date().toISOString(),
  }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (before && before !== after) {
    await supabase.from('ws_note_edits').insert({
      note_id: params.id, user_id: user.id, note_type: note.note_type,
      before_text: before.slice(0, 4000), after_text: after.slice(0, 4000),
    });
  }
  waitUntil(indexNote(params.id, after));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { error } = await auth.supabase.from('ws_notes').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Retry a failed generation.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { data } = await auth.supabase.from('ws_notes')
    .update({ status: 'processing', error: null, updated_at: new Date().toISOString() }).eq('id', params.id).eq('status', 'failed').select('id').maybeSingle();
  if (!data) return NextResponse.json({ error: 'Nothing to retry' }, { status: 409 });
  waitUntil(processNote(params.id));
  return NextResponse.json({ ok: true });
}
