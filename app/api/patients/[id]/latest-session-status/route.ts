import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export const maxDuration = 10;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const service = createServiceRoleClient();

  // Get the most recent session for this patient that is owned by this therapist
  const { data: session } = await service
    .from('sessions')
    .select('id, status, transcript_raw')
    .eq('patient_id', params.id)
    .eq('therapist_id', therapist.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasTranscript = Array.isArray(session?.transcript_raw) && session.transcript_raw.length > 0;

  return NextResponse.json({
    sessionStatus: session?.status ?? 'none',
    sessionId: session?.id ?? null,
    hasTranscript,
  });
}
