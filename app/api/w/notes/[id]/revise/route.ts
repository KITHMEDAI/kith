import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireApiUser, indexNote, openInput } from '@/lib/workspace/server';
import { reviseNote, noteToText, type NoteContent } from '@/lib/workspace/generate';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 120;

// "Add details or ask for changes": the user types free text and the AI
// rewrites the note (additions, corrections or editing instructions).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const { request } = await req.json().catch(() => ({})) as { request?: string };
  const text = String(request ?? '').trim();
  if (!text) return NextResponse.json({ error: 'Type what to add or change' }, { status: 422 });
  if (text.length > 4000) return NextResponse.json({ error: 'Keep it under 4,000 characters' }, { status: 422 });
  if (!checkRateLimit(`ws-revise:${user.id}`, 40, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'Too many updates in a short time. Try again shortly.' }, { status: 429 });
  }

  const { data: note } = await supabase.from('ws_notes')
    .select('id, note_type, field, content, input_enc, status, created_at').eq('id', params.id).maybeSingle();
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (note.status !== 'completed' || !note.content) return NextResponse.json({ error: 'The note is still being written' }, { status: 409 });

  const { data: profile } = await supabase.from('ws_profiles')
    .select('field, field_custom, field_profile').eq('user_id', user.id).maybeSingle();

  let updated: NoteContent;
  try {
    updated = await reviseNote({
      current: note.content as NoteContent,
      originalInput: openInput(note.input_enc),
      request: text,
      field: profile?.field || note.field,
      fieldCustom: profile?.field_custom,
      fieldProfile: profile?.field_profile,
      noteType: note.note_type,
      date: new Date(note.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
      dateISO: note.created_at,
    });
  } catch {
    return NextResponse.json({ error: 'Could not update the note. Try again.' }, { status: 502 });
  }

  const before = noteToText(note.content as NoteContent);
  const after = noteToText(updated);
  const { error } = await supabase.from('ws_notes').update({
    content: updated, title: updated.title, summary: updated.summary,
    search_text: after, updated_at: new Date().toISOString(),
  }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (before !== after) {
    await supabase.from('ws_note_edits').insert({
      note_id: params.id, user_id: user.id, note_type: note.note_type,
      before_text: before.slice(0, 4000), after_text: after.slice(0, 4000),
    });
  }
  waitUntil(indexNote(params.id, after));
  return NextResponse.json({ content: updated, changed: before !== after });
}
