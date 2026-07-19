/**
 * POST /api/account/delete
 *
 * Full self-serve account deletion. Every clinical table (patients, sessions,
 * appointments, patient_metrics) has `therapist_id UUID REFERENCES
 * therapists(id) ON DELETE CASCADE`, and `therapists.user_id REFERENCES
 * auth.users(id) ON DELETE CASCADE` — so deleting the auth user cascades
 * through the entire schema. The only thing NOT covered by a DB cascade is
 * the avatar file in Storage, which we remove explicitly first.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { confirm, password } = await req.json().catch(() => ({}));
  if (confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  }

  // Typing "DELETE" alone was the only gate on this irreversible action —
  // anyone who inherits a live session (stolen/shared device, XSS, a
  // forgotten logged-in browser) could wipe the account and every patient's
  // clinical data with no further check. Require the actual password too,
  // verified against a throwaway client with no cookie/session persistence
  // so it can't interfere with the real session being deleted right after.
  //
  // Google is also a real sign-in method here (not just Calendar connect),
  // so some accounts have no password at all — only require this check for
  // accounts that actually have an email/password identity, so a Google-only
  // user isn't permanently locked out of deleting their own account.
  const hasPasswordIdentity = (user.identities || []).some(i => i.provider === 'email');
  if (hasPasswordIdentity) {
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Enter your password to confirm account deletion.' }, { status: 400 });
    }
    if (!user.email) {
      return NextResponse.json({ error: 'Could not verify password for this account — contact support.' }, { status: 400 });
    }
    const verifyClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: reauthErr } = await verifyClient.auth.signInWithPassword({ email: user.email, password });
    if (reauthErr) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }
  }

  const admin = createServiceRoleClient();

  // Best-effort avatar cleanup — not cascaded by the DB, and failure here
  // shouldn't block the actual account deletion.
  try {
    const { data: files } = await admin.storage.from('kith-avatars').list(user.id);
    if (files?.length) {
      await admin.storage.from('kith-avatars').remove(files.map(f => `${user.id}/${f.name}`));
    }
  } catch (err) {
    console.warn('[Kith] account delete: avatar cleanup failed (non-fatal):', err);
  }

  // Cascades to therapists → patients/sessions/appointments/patient_metrics.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[Kith] account delete failed:', error.message);
    return NextResponse.json({ error: 'Could not delete account — please contact support.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
