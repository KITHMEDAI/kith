import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/workspace/server';
import { limited, LIMITS } from '@/lib/workspace/rate';

// Live-transcription credential for the recorder (signed-in users only).
// Returns a SHORT-LIVED Deepgram access token (Deepgram /v1/auth/grant),
// never the account API key. The browser opens its WebSocket with it within
// seconds; an open socket keeps working after the token expires, and the
// recorder fetches a fresh token if it has to reconnect.
const TTL_SECONDS = 120;

export async function GET() {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const tooMany = await limited(`ws-token:${auth.user.id}`, LIMITS.token, 'Too many recording starts. Try again shortly.');
  if (tooMany) return tooMany;

  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return NextResponse.json({ error: 'Transcription is not configured' }, { status: 500 });

  const res = await fetch('https://api.deepgram.com/v1/auth/grant', {
    method: 'POST',
    headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl_seconds: TTL_SECONDS }),
    cache: 'no-store',
  });
  const j = await res.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
  if (!res.ok || !j.access_token) {
    return NextResponse.json({ error: 'Could not start transcription. Try again.' }, { status: 502 });
  }
  return NextResponse.json(
    { token: j.access_token, scheme: 'bearer', expiresIn: j.expires_in ?? TTL_SECONDS },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
