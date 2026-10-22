import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireApiUser } from '@/lib/workspace/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { limited, LIMITS } from '@/lib/workspace/rate';
import { sweepUserAudio } from '@/lib/workspace/cleanup';

// One-time signed upload URL for a recording's audio (polish pass). The
// browser uploads straight to the private bucket (no size limit from our API),
// into a folder named after the user, and the server deletes it after use.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const tooMany = await limited(`ws-upload:${auth.user.id}`, LIMITS.upload, 'Too many uploads. Try again shortly.');
  if (tooMany) return tooMany;
  const { ext } = await req.json().catch(() => ({})) as { ext?: string };
  const safeExt = ['webm', 'ogg', 'mp4', 'm4a'].includes(String(ext)) ? ext : 'webm';
  const path = `${auth.user.id}/${randomUUID()}.${safeExt}`;
  const service = createServiceRoleClient();
  // Retention backstop: drop this user's own leftover recordings (> 30 min old).
  await sweepUserAudio(service, auth.user.id).catch(() => 0);
  const { data, error } = await service.storage.from('ws-audio').createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: 'Could not prepare upload' }, { status: 500 });
  return NextResponse.json({ path, token: data.token });
}
