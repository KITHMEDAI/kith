import { NextResponse } from 'next/server';
import { requireApiUser, openInput } from '@/lib/workspace/server';
import { openNote } from '@/lib/workspace/note-fields';
import { open } from '@/lib/workspace/crypto';
import { limited, LIMITS } from '@/lib/workspace/rate';

export const maxDuration = 60;

const PAGE = 500;
const NOTE_COLS = 'id, created_at, updated_at, note_type, custom_instruction, input_mode, duration_seconds, transcript_source, recording_consent_at, status, title, summary, content, input_enc';

// "Download my data" (APP 12 access): everything Kith holds about the account,
// decrypted, as one JSON file. Only the caller's own rows (RLS + user filter).
export async function GET() {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;
  const tooMany = await limited(`ws-export:${user.id}`, LIMITS.export, 'Too many downloads. Try again later.');
  if (tooMany) return tooMany;

  const { data: profile } = await supabase.from('ws_profiles')
    .select('name, email, phone, field, field_custom, field_profile, note_preferences, default_note_type, style_notes, custom_terms, terms_accepted_at, created_at, updated_at')
    .eq('user_id', user.id).maybeSingle();

  const notes: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('ws_notes').select(NOTE_COLS)
      .eq('user_id', user.id).order('created_at', { ascending: true }).range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: 'Could not prepare the download. Try again.' }, { status: 500 });
    for (const r of data ?? []) {
      const { input_enc, ...rest } = openNote(r);
      notes.push({ ...rest, original_input: openInput(input_enc) });
    }
    if (!data || data.length < PAGE) break;
  }

  const body = {
    exported_at: new Date().toISOString(),
    service: 'Kith Workspace (work.kith.space)',
    account: { id: user.id, email: user.email, created_at: user.created_at, sign_in_methods: user.app_metadata?.providers ?? [] },
    profile: profile ? { ...profile, style_notes: open(profile.style_notes) || null, custom_terms: open(profile.custom_terms) || null } : null,
    notes,
    not_included: 'Recordings are deleted right after transcription, so there are none to export.',
  };
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="kith-workspace-export-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
