import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getRealtimeToken } from '@/lib/deepgram';

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: therapist } = await supabase
      .from('therapists').select('id').eq('user_id', user.id).single();
    if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const service = createServiceRoleClient();

    const { data: session, error } = await service
      .from('sessions')
      .select('id, status, appointment_id, therapist_id')
      .eq('id', sessionId)
      .single();

    if (error || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.therapist_id !== therapist.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (session.status === 'completed') return NextResponse.json({ error: 'Session already completed' }, { status: 400 });

    // Get a fresh Deepgram token for continued streaming
    const token = await getRealtimeToken();
    return NextResponse.json({ token, session });
  } catch (err) {
    console.error('[resume]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
