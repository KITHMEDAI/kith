import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/workspace/server';
import { getRealtimeToken } from '@/lib/deepgram';

// Live-transcription credential for the recorder (signed-in users only).
export async function GET() {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  return NextResponse.json({ token: await getRealtimeToken() }, { headers: { 'Cache-Control': 'no-store' } });
}
