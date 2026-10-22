import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireApiUser, indexNote, processNote, MAX_ATTEMPTS } from '@/lib/workspace/server';
import { noteToText, sanitizeContent, type NoteContent } from '@/lib/workspace/generate';
import { deleteAudio } from '@/lib/workspace/polish';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { limited, LIMITS } from '@/lib/workspace/rate';

export const maxDuration = 300;

// A note still 'processing' after this long was lost (e.g. a function timeout):
// surface it as failed so the user can retry instead of waiting forever.
const STUCK_AFTER_MS = 5 * 60 * 1000;

const COLS = 'id, title, note_type, field, input_mode, status, content, summary, error, duration_seconds, attempts, created_at, updated_at';
const UUID_RE = /^[0-9a-f-]{36}$/i;

// Reads use the user's own client (RLS: owner only). Writes use the service
// role, always scoped to the signed-in user's id (clients can't write, migration 003).

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data } = await auth.supabase.from('ws_notes').select(COLS).eq('id', params.id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (data.status === 'processing' && Date.now() - new Date(data.updated_at).getTime() > STUCK_AFTER_MS) {
    await createServiceRoleClient().from('ws_notes').update({ status: 'failed', error: 'Timed out' })
      .eq('id', params.id).eq('user_id', auth.user.id).eq('status', 'processing');
    data.status = 'failed';
  }
  return NextResponse.json(
    { ...data, can_retry: (data.attempts ?? 1) < MAX_ATTEMPTS },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

// Save the user's edits. The before/after pair becomes a style example for
// future notes of the same type.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => ({})) as { content?: unknown };
  const content = sanitizeContent(body.content);
  if (!content) return NextResponse.json({ error: 'That note could not be saved (invalid format).' }, { status: 422 });
  const tooMany = await limited(`ws-edit:${user.id}`, LIMITS.edit, 'Too many saves in a short time. Try again shortly.');
  if (tooMany) return tooMany;

  const { data: note } = await supabase.from('ws_notes').select('content, note_type, status').eq('id', params.id).maybeSingle();
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (note.status !== 'completed') return NextResponse.json({ error: 'The note is still being written' }, { status: 409 });

  const before = note.content ? noteToText(note.content as NoteContent) : '';
  const after = noteToText(content);
  const service = createServiceRoleClient();
  const { error } = await service.from('ws_notes').update({
    content, title: content.title, summary: content.summary,
    search_text: after, updated_at: new Date().toISOString(),
  }).eq('id', params.id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 });

  if (before && before !== after) {
    await service.from('ws_note_edits').insert({
      note_id: params.id, user_id: user.id, note_type: note.note_type,
      before_text: before.slice(0, 4000), after_text: after.slice(0, 4000),
    });
  }
  waitUntil(indexNote(params.id, after));
  return NextResponse.json({ ok: true });
}

// Delete a note, its edits (cascade), its embedding (same row) and any
// recording still waiting for the polish pass.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data: note } = await auth.supabase.from('ws_notes').select('audio_paths').eq('id', params.id).maybeSingle();
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const service = createServiceRoleClient();
  const own = (note.audio_paths ?? []).filter((a: string) => a.slice(a.indexOf(':') + 1).startsWith(`${auth.user.id}/`));
  await deleteAudio(service, own);
  const { error } = await service.from('ws_notes').delete().eq('id', params.id).eq('user_id', auth.user.id);
  if (error) return NextResponse.json({ error: 'Could not delete. Try again.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Retry a failed generation (limited attempts per note, and per user per hour).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data: note } = await auth.supabase.from('ws_notes').select('status, attempts').eq('id', params.id).maybeSingle();
  if (!note || note.status !== 'failed') return NextResponse.json({ error: 'Nothing to retry' }, { status: 409 });
  if ((note.attempts ?? 1) >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'This note could not be written after several tries. Create it again, or contact support.' }, { status: 409 });
  }
  const tooMany = await limited(`ws-retry:${auth.user.id}`, LIMITS.retry, 'Too many retries in a short time. Try again later.');
  if (tooMany) return tooMany;

  const { data } = await createServiceRoleClient().from('ws_notes')
    .update({ status: 'processing', error: null, attempts: (note.attempts ?? 1) + 1, updated_at: new Date().toISOString() })
    .eq('id', params.id).eq('user_id', auth.user.id).eq('status', 'failed').eq('attempts', note.attempts ?? 1)
    .select('id').maybeSingle();
  if (!data) return NextResponse.json({ error: 'Nothing to retry' }, { status: 409 });
  waitUntil(processNote(params.id));
  return NextResponse.json({ ok: true });
}
