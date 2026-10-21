import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireApiUser, getProfile, sealInput, processNote } from '@/lib/workspace/server';
import { NOTE_TYPE_MAP } from '@/lib/workspace/note-types';

export const maxDuration = 60;

// Create a note from a recording transcript or typed text. Returns the id
// immediately; generation continues in the background and the note page polls.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const input = String(body.input ?? '').trim();
  const inputMode = body.input_mode === 'recorded' ? 'recorded' : 'typed';
  const noteType = typeof body.note_type === 'string' && NOTE_TYPE_MAP[body.note_type] ? body.note_type : 'general';
  const customInstruction = noteType === 'custom' ? String(body.custom_instruction ?? '').slice(0, 600) : undefined;
  const duration = Number.isFinite(Number(body.duration_seconds)) ? Math.round(Number(body.duration_seconds)) : null;

  if (input.split(/\s+/).length < 3) {
    return NextResponse.json({ error: 'Not enough content yet: say or type a little more.' }, { status: 422 });
  }

  const profile = await getProfile(user.id);
  if (!profile) return NextResponse.json({ error: 'Finish onboarding first' }, { status: 409 });

  const { data, error } = await supabase.from('ws_notes').insert({
    user_id: user.id,
    note_type: noteType,
    custom_instruction: customInstruction ?? null,
    field: profile.field,
    input_mode: inputMode,
    input_enc: sealInput(input),
    duration_seconds: duration,
    status: 'processing',
  }).select('id').single();
  if (error || !data) return NextResponse.json({ error: error?.message || 'Could not save' }, { status: 500 });

  // Remember the last-used type so it's pre-selected next time.
  await supabase.from('ws_profiles').update({ default_note_type: noteType }).eq('user_id', user.id);

  waitUntil(processNote(data.id));
  return NextResponse.json({ id: data.id });
}
