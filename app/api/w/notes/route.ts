import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireApiUser, getProfile, sealInput, processNote } from '@/lib/workspace/server';
import { NOTE_TYPE_MAP } from '@/lib/workspace/note-types';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 300; // long meetings: generation runs after the response via waitUntil

const MAX_INPUT_CHARS = 150_000; // ~2.5 hours of speech

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

  // Real words only: speaker labels and emoji/punctuation don't count.
  const words = input.replace(/^\s*[^:\n]{1,40}:\s/gm, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
  if (words.length < 3) {
    return NextResponse.json({ error: 'Not enough content yet: say or type a little more.' }, { status: 422 });
  }
  if (input.length > MAX_INPUT_CHARS) {
    return NextResponse.json({ error: 'That is too long for one note (about 2.5 hours of speech). Split it into parts.' }, { status: 413 });
  }
  if (!checkRateLimit(`ws-notes:${user.id}`, 40, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'You have created a lot of notes in the last hour. Try again shortly.' }, { status: 429 });
  }

  // Audio uploaded for the polish pass: only files in this user's own folder.
  const audio = (Array.isArray(body.audio) ? body.audio : [])
    .filter((a: { track?: string; path?: string }) =>
      a && ['room', 'tab', 'mic'].includes(String(a.track)) && typeof a.path === 'string'
      && a.path.startsWith(`${user.id}/`) && !a.path.includes('..'))
    .slice(0, 2)
    .map((a: { track: string; path: string }) => `${a.track}:${a.path}`);

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
    audio_paths: inputMode === 'recorded' ? audio : [],
    transcript_source: inputMode === 'recorded' ? 'live' : null,
    status: 'processing',
  }).select('id').single();
  if (error || !data) return NextResponse.json({ error: error?.message || 'Could not save' }, { status: 500 });

  // Remember the last-used type so it's pre-selected next time.
  await supabase.from('ws_profiles').update({ default_note_type: noteType }).eq('user_id', user.id);

  waitUntil(processNote(data.id));
  return NextResponse.json({ id: data.id });
}
