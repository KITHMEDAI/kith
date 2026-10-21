import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireApiUser } from '@/lib/workspace/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

// One-time signed upload URL for a recording's audio (polish pass). The
// browser uploads straight to the private bucket (no size limit from our API),
// into a folder named after the user, and the server deletes it after use.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  if (!checkRateLimit(`ws-upload:${auth.user.id}`, 60, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'Too many uploads. Try again shortly.' }, { status: 429 });
  }
  const { ext } = await req.json().catch(() => ({})) as { ext?: string };
  const safeExt = ['webm', 'ogg', 'mp4', 'm4a'].includes(String(ext)) ? ext : 'webm';
  const path = `${auth.user.id}/${randomUUID()}.${safeExt}`;
  const { data, error } = await createServiceRoleClient().storage.from('ws-audio').createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: 'Could not prepare upload' }, { status: 500 });
  return NextResponse.json({ path, token: data.token });
}
