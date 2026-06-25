import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { deleteTokensFromVault } from '@/lib/google-calendar';

export async function POST() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists')
    .select('id, google_calendar_vault_secret_id')
    .eq('user_id', user.id)
    .single();

  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (therapist.google_calendar_vault_secret_id) {
    await deleteTokensFromVault(therapist.google_calendar_vault_secret_id);
    const serviceClient = createServiceRoleClient();
    await serviceClient
      .from('therapists')
      .update({ google_calendar_vault_secret_id: null })
      .eq('id', therapist.id);
  }

  return NextResponse.json({ ok: true });
}
