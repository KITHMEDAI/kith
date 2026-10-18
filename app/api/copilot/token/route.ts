import { NextResponse } from 'next/server';
import { copilotAllowed } from '@/lib/copilot/guard';

// Deepgram key for the local copilot's two live streams (same browser-side
// subprotocol auth the session recorder uses). Local-only — see guard.ts.
export async function GET(req: Request) {
  if (!copilotAllowed(req)) return new NextResponse('Not found', { status: 404 });
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return NextResponse.json({ error: 'DEEPGRAM_API_KEY not set in .env.local' }, { status: 500 });
  return NextResponse.json({ token: key });
}
