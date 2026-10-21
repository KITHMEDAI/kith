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

// Encryption is optional in dev (no ENCRYPTION_SECRET) — store plain text then.
export function sealInput(text: string): string {
  try { return process.env.ENCRYPTION_SECRET ? `enc:${encrypt(text)}` : text; } catch { return text; }
}
export function openInput(stored: string | null): string {
  if (!stored) return '';
  if (!stored.startsWith('enc:')) return stored;
  try { return decrypt(stored.slice(4)); } catch { return ''; }
}

/** Generate the note for a row in "processing" state, then index it. Safe to call twice. */
export async function processNote(noteId: string): Promise<void> {
  const service = createServiceRoleClient();
  const { data: note } = await service.from('ws_notes')
    .select('id, user_id, note_type, custom_instruction, field, input_mode, input_enc, status, created_at')
    .eq('id', noteId).single();
  if (!note || note.status !== 'processing') return;

  const [{ data: profile }, { data: edits }] = await Promise.all([
    service.from('ws_profiles').select('*').eq('user_id', note.user_id).maybeSingle(),
    service.from('ws_note_edits').select('before_text, after_text')
      .eq('user_id', note.user_id).eq('note_type', note.note_type)
      .order('created_at', { ascending: false }).limit(3),
  ]);
  const p = profile as WsProfile | null;

  try {
    const content = await generateNote({
      input: openInput(note.input_enc),
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
    await service.from('ws_notes').update({
      status: 'failed', error: (err as Error).message.slice(0, 500), updated_at: new Date().toISOString(),
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
