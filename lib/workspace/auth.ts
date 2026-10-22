/**
 * lib/workspace/auth.ts
 *
 * Shared step for sign-up verification and password reset.
 */
import { NextResponse } from 'next/server';
import type { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Sets the password from the session the emailed code just created. Done as
 * the user (not the admin API): Supabase then keeps THIS session and revokes
 * every other one. An admin password change revokes all sessions, which left
 * people signed out right after verifying.
 */
export async function setPasswordOnThisSession(supabase: ReturnType<typeof createServerSupabaseClient>, password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (!error) return NextResponse.json({ ok: true });
  const msg = error.message || '';
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  if (/different from the old/i.test(msg)) return NextResponse.json({ error: 'Choose a password different from your old one.' }, { status: 422 });
  if (/weak|pwned|leaked|characters/i.test(msg)) return NextResponse.json({ error: 'That password is too weak or has appeared in a data breach. Choose another.' }, { status: 422 });
  return NextResponse.json({ error: 'Could not set the password. Try again.' }, { status: 500 });
}
