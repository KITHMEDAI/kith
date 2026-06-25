import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getRealtimeToken } from '@/lib/deepgram';

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const supabase = createServiceRoleClient();

    const { data: session, error } = await supabase
      .from('sessions')
      .select('id, status, appointment_id')
      .eq('id', sessionId)
      .single();

    if (error || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.status === 'completed') return NextResponse.json({ error: 'Session already completed' }, { status: 400 });

    // Get a fresh Deepgram token for continued streaming
    const token = await getRealtimeToken();
    return NextResponse.json({ token, session });
  } catch (err) {
    console.error('[resume]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
