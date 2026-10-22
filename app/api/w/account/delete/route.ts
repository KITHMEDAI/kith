import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/workspace/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { deleteAllUserAudio } from '@/lib/workspace/cleanup';
import { limited, sameOrigin, LIMITS } from '@/lib/workspace/rate';

export const maxDuration = 60;

// Self-serve account deletion (APP 11/12): every recording in the user's
// storage folder, then the sign-in account itself, which cascades to the
// profile and every note (ON DELETE CASCADE, migration 001). The user must
// type their email address to confirm. Rate-limit counters expire on their own.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { confirm } = await req.json().catch(() => ({})) as { confirm?: string };
  if (!user.email || String(confirm ?? '').trim().toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Type your email address exactly to confirm.' }, { status: 422 });
  }
  const tooMany = await limited(`ws-delete:${user.id}`, LIMITS.deleteAccount, 'Too many attempts. Try again later.');
  if (tooMany) return tooMany;

  const service = createServiceRoleClient();
  // Recordings first: storage isn't covered by the database cascade.
  if (!(await deleteAllUserAudio(service, user.id))) {
    return NextResponse.json({ error: 'Could not finish deleting your recordings. Your account is still there; try again.' }, { status: 500 });
  }
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[workspace] account delete failed:', error.message);
    return NextResponse.json({ error: 'Could not delete the account. Try again, or contact support.' }, { status: 500 });
  }
  // Belt and braces: the cascade should already have removed these.
  await Promise.all([
    service.from('ws_notes').delete().eq('user_id', user.id),
    service.from('ws_profiles').delete().eq('user_id', user.id),
  ]);
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  return NextResponse.json({ ok: true });
}
