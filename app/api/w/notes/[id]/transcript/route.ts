import { NextResponse } from 'next/server';
import { requireApiUser, openInput } from '@/lib/workspace/server';

const UUID_RE = /^[0-9a-f-]{36}$/i;

// The original input of a note (typed text or transcript), decrypted for its
// owner only (RLS + explicit user filter). Part of access under APP 12.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data } = await auth.supabase.from('ws_notes')
    .select('input_enc, input_mode, transcript_source, recording_consent_at')
    .eq('id', params.id).eq('user_id', auth.user.id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    input: openInput(data.input_enc),
    input_mode: data.input_mode,
    transcript_source: data.transcript_source,
    recording_consent_at: data.recording_consent_at,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
