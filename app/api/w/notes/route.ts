import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireApiUser, getProfile, sealInput, processNote } from '@/lib/workspace/server';
import { isOwnAudioPath, deleteAudio } from '@/lib/workspace/polish';
import { NOTE_TYPE_MAP } from '@/lib/workspace/note-types';
import { realWordCount } from '@/lib/workspace/words';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sealOrNull } from '@/lib/workspace/crypto';
import { limited, LIMITS } from '@/lib/workspace/rate';

export const maxDuration = 300; // long meetings: generation runs after the response via waitUntil

const MAX_INPUT_CHARS = 150_000; // ~2.5 hours of speech

// Create a note from a recording transcript or typed text. Returns the id
// immediately; generation continues in the background and the note page polls.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { user } = auth;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const input = String(body.input ?? '').trim();
  const inputMode = body.input_mode === 'recorded' ? 'recorded' : 'typed';
  const noteType = typeof body.note_type === 'string' && Object.hasOwn(NOTE_TYPE_MAP, body.note_type) ? body.note_type : 'general';
  const customInstruction = noteType === 'custom' ? String(body.custom_instruction ?? '').slice(0, 600) : undefined;
  const rawDuration = Number(body.duration_seconds);
  const duration = Number.isFinite(rawDuration) ? Math.min(Math.max(Math.round(rawDuration), 0), 6 * 3600) : null;
  // Per-recording consent: the user confirms, for THIS recording, that everyone
  // recorded agreed. Stored on the note (when they confirmed, else now).
  const consentAt = consentTime(body.recording_consent, body.recording_consent_at);

  // Audio uploaded for the polish pass: only files in this user's own folder.
  const audio = (Array.isArray(body.audio) ? body.audio : [])
    .filter((a: { track?: string; path?: string }) =>
      a && ['room', 'tab', 'mic'].includes(String(a.track)) && typeof a.path === 'string'
      && isOwnAudioPath(a.path, user.id))
    .slice(0, 2)
    .map((a: { track: string; path: string }) => `${a.track}:${a.path}`);

  // Any rejection below must not leave the uploaded recording behind.
  const service = createServiceRoleClient();
  const reject = async (error: string, status: number) => {
    await deleteAudio(service, audio);
    return NextResponse.json({ error }, { status });
  };

  if (inputMode === 'recorded' && !consentAt) {
    return reject('Confirm that everyone in the recording agreed to be recorded.', 422);
  }
  // Real words only: speaker labels and emoji/punctuation don't count.
  if (realWordCount(input) < 3) {
    return reject('Not enough content yet: say or type a little more.', 422);
  }
  if (input.length > MAX_INPUT_CHARS) {
    return reject('That is too long for one note (about 2.5 hours of speech). Split it into parts.', 413);
  }
  const tooMany = await limited(`ws-notes:${user.id}`, LIMITS.note, 'You have created a lot of notes recently. Try again a bit later.');
  if (tooMany) { await deleteAudio(service, audio); return tooMany; }

  const profile = await getProfile(user.id);
  if (!profile) return reject('Finish onboarding first', 409);

  // Writes use the service role (clients can only read/delete, migration 003).
  const { data, error } = await service.from('ws_notes').insert({
    user_id: user.id,
    note_type: noteType,
    custom_instruction: sealOrNull(customInstruction),
    field: profile.field,
    input_mode: inputMode,
    input_enc: sealInput(input),
    duration_seconds: duration,
    audio_paths: inputMode === 'recorded' ? audio : [],
    transcript_source: inputMode === 'recorded' ? 'live' : null,
    recording_consent_at: inputMode === 'recorded' ? consentAt : null,
    status: 'processing',
  }).select('id').single();
  if (error || !data) return reject('Could not save the note. Try again.', 500);
  if (inputMode !== 'recorded') await deleteAudio(service, audio);

  // Remember the last-used type so it's pre-selected next time.
  await service.from('ws_profiles').update({ default_note_type: noteType }).eq('user_id', user.id);

  waitUntil(processNote(data.id));
  return NextResponse.json({ id: data.id });
}

/** The consent timestamp to store: the client's confirm time if it is plausible (within the last 7 hours), else now. */
function consentTime(given: unknown, at: unknown): string | null {
  if (given !== true) return null;
  const t = typeof at === 'string' ? Date.parse(at) : NaN;
  const now = Date.now();
  return new Date(Number.isFinite(t) && t <= now && t > now - 7 * 3600_000 ? t : now).toISOString();
}
