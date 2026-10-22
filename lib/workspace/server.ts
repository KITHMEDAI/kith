/**
 * lib/workspace/server.ts
 *
 * Server-side helpers for Kith Workspace: auth/profile lookup, note
 * processing (generate → index), and resilient embeddings for search.
 */
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient, createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/encryption';
import { embedDocument } from '@/lib/embeddings';
import { withTimeout, embedQueryFast } from './embed';

export { embedQueryFast };
import { generateNote, noteToText, type NoteContent } from './generate';
import { polishTranscript, parseAudioPaths, deleteAudio } from './polish';
import { rateHit, AUDIO_MINUTES_PER_DAY } from './rate';

export const IS_WORKSPACE = process.env.NEXT_PUBLIC_EDITION === 'workspace';

export interface WsProfile {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  field: string;
  field_custom: string | null;
  field_profile: string | null;
  note_preferences: string | null;
  default_note_type: string | null;
  recording_consent_ack_at: string | null;
}

export interface WsNote {
  id: string;
  title: string | null;
  note_type: string;
  field: string;
  input_mode: 'typed' | 'recorded';
  status: 'processing' | 'completed' | 'failed';
  content: NoteContent | null;
  summary: string | null;
  error: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

/** API guard: 404 outside the workspace edition, 401 without a user. */
export async function requireApiUser() {
  if (!IS_WORKSPACE) return { error: new NextResponse('Not found', { status: 404 }) } as const;
  const user = await getAuthUser();
  if (!user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) } as const;
  return { user, supabase: createServerSupabaseClient() } as const;
}

/**
 * For pages: the signed-in user's profile, or a redirect to sign-in /
 * onboarding. Next renders layouts and pages in parallel, so each page must
 * guard itself rather than rely on the layout's redirect.
 */
export async function requirePageProfile(): Promise<{ userId: string; profile: WsProfile }> {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  const profile = await getProfile(user.id);
  if (!profile) redirect('/onboarding');
  return { userId: user.id, profile };
}

export async function getProfile(userId: string): Promise<WsProfile | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from('ws_profiles').select('*').eq('user_id', userId).maybeSingle();
  return (data as WsProfile | null) ?? null;
}

// Encryption is optional in local dev only. In production a missing key or a
// failed encryption is an error: never silently store plain text.
export function sealInput(text: string): string {
  if (!process.env.ENCRYPTION_SECRET) {
    if (process.env.NODE_ENV === 'production') throw new Error('ENCRYPTION_SECRET is not set');
    return text;
  }
  return `enc:${encrypt(text)}`;
}
export function openInput(stored: string | null): string {
  if (!stored) return '';
  if (!stored.startsWith('enc:')) return stored;
  try { return decrypt(stored.slice(4)); } catch {
    console.error('[workspace] could not decrypt a note input (key changed?)');
    return '';
  }
}

/** Max generation attempts per note (first try + retries). */
export const MAX_ATTEMPTS = 3;

/** Generate the note for a row in "processing" state, then index it. Safe to call twice. */
export async function processNote(noteId: string): Promise<void> {
  const service = createServiceRoleClient();
  const { data: note } = await service.from('ws_notes')
    .select('id, user_id, note_type, custom_instruction, field, input_mode, input_enc, audio_paths, duration_seconds, status, created_at')
    .eq('id', noteId).single();
  if (!note || note.status !== 'processing') return;

  const [{ data: profile }, { data: edits }] = await Promise.all([
    service.from('ws_profiles').select('*').eq('user_id', note.user_id).maybeSingle(),
    service.from('ws_note_edits').select('before_text, after_text')
      .eq('user_id', note.user_id).eq('note_type', note.note_type)
      .order('created_at', { ascending: false }).limit(3),
  ]);
  const p = profile as WsProfile | null;

  // Polish pass: re-transcribe the uploaded recording as a whole file (more
  // accurate, better speakers). Falls back to the live transcript on failure.
  // The DB reference is cleared BEFORE calling Deepgram, so a function that
  // times out can never re-bill the same file on retry (the cleanup job
  // removes any file left behind).
  let input = openInput(note.input_enc);
  const rawAudio: string[] = note.audio_paths ?? [];
  const audio = parseAudioPaths(rawAudio, note.user_id); // only the owner's own folder
  if (rawAudio.length) await service.from('ws_notes').update({ audio_paths: [] }).eq('id', noteId);
  if (audio.length) {
    // Daily budget of re-transcribed minutes per user (Deepgram bills per minute).
    const claimedMin = Math.max(1, Math.ceil((note.duration_seconds ?? 60) / 60)) * audio.length;
    const overBudget = await rateHit(`ws-audio-min:${note.user_id}`, [[AUDIO_MINUTES_PER_DAY, 86400]], claimedMin);
    if (overBudget) {
      await deleteAudio(service, audio);
    } else {
      try {
        const { transcript: polished, seconds } = await polishTranscript(service, audio, p?.field || note.field, (p?.name || 'Me').split(' ')[0]);
        // Charge the real length if the file was longer than the note claimed.
        const extra = Math.ceil(seconds / 60) - claimedMin;
        if (extra > 0) await rateHit(`ws-audio-min:${note.user_id}`, [[AUDIO_MINUTES_PER_DAY, 86400]], extra);
        const liveWords = input.split(/\s+/).length;
        if (polished && polished.split(/\s+/).length >= Math.min(20, liveWords * 0.5)) {
          input = polished;
          await service.from('ws_notes').update({ input_enc: sealInput(polished), transcript_source: 'polished' }).eq('id', noteId);
        }
      } catch (err) {
        console.warn('[workspace] polish pass failed, using live transcript:', (err as Error).message);
      }
    }
  }
  // Anything that wasn't a valid own-folder path is never touched (no signing,
  // no deleting other users' files).

  try {
    const content = await generateNote({
      input,
      inputMode: note.input_mode,
      noteType: note.note_type,
      customInstruction: note.custom_instruction ?? undefined,
      field: p?.field || note.field,
      fieldCustom: p?.field_custom,
      fieldProfile: p?.field_profile,
      preferences: p?.note_preferences,
      styleExamples: (edits ?? []).map(e => ({ before: e.before_text, after: e.after_text })),
      userName: p?.name,
      date: new Date(note.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
      dateISO: note.created_at,
    });
    const text = noteToText(content);
    await service.from('ws_notes').update({
      status: 'completed', content, title: content.title, summary: content.summary,
      search_text: text, error: null, updated_at: new Date().toISOString(),
    }).eq('id', noteId);
    await indexNote(noteId, text);
  } catch (err) {
    console.warn('[workspace] note generation failed:', (err as Error).message.slice(0, 200));
    await service.from('ws_notes').update({
      status: 'failed', error: 'Generation failed', updated_at: new Date().toISOString(),
    }).eq('id', noteId).eq('status', 'processing');
  }
}

/** Best-effort embedding; keyword search still works if this fails. */
export async function indexNote(noteId: string, text: string): Promise<void> {
  try {
    const vector = await withTimeout(embedDocument(text.slice(0, 16000)), 60_000);
    if (!vector) return;
    await createServiceRoleClient().from('ws_notes').update({ embedding: JSON.stringify(vector) }).eq('id', noteId);
  } catch (err) {
    console.warn('[workspace] embedding failed (non-fatal):', (err as Error).message);
  }
}
