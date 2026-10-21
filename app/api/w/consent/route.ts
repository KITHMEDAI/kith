import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/workspace/server';

// Records that the user confirmed everyone being recorded has agreed.
export async function POST() {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  await auth.supabase.from('ws_profiles')
    .update({ recording_consent_ack_at: new Date().toISOString() }).eq('user_id', auth.user.id);
  return NextResponse.json({ ok: true });
}
