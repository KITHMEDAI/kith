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
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
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
