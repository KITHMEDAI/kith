/**
 * POST /api/sessions/[id]/retry-notes
 *
 * Re-runs note generation on a session whose notes previously failed (or got
 * stuck). The transcript is already saved on the session row, so we just reset
 * status → 'processing' and fire-and-forget the background processor again.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export const maxDuration = 30;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const service = createServiceRoleClient();
  const { data: session } = await service
    .from('sessions')
    .select('id, therapist_id, status, transcript_raw')
    .eq('id', params.id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.therapist_id !== therapist.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!session.transcript_raw || (Array.isArray(session.transcript_raw) && session.transcript_raw.length === 0)) {
    return NextResponse.json({ error: 'No transcript saved for this session — cannot regenerate.' }, { status: 422 });
  }

  // Reset to processing so the (idempotent) processor will run — it guards on this state.
  await service.from('sessions').update({ status: 'processing' }).eq('id', params.id);

  const baseUrl = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
  const internalSecret = process.env.INTERNAL_API_SECRET || '';

  fetch(`${baseUrl}/api/sessions/process-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
    body: JSON.stringify({ sessionId: params.id }),
  }).catch(err => console.error('[Kith] retry process-notes trigger failed:', err));

  return NextResponse.json({ ok: true });
}
