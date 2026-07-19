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
    // deleteTokensFromVault does `.eq('id', therapistId)` against the
    // therapists table — it needs the real UUID, not the `direct_<uuid>`
    // sentinel string stored in google_calendar_vault_secret_id. Passing the
    // sentinel meant this matched zero rows, so google_calendar_tokens (the
    // actual access/refresh tokens) was never cleared — only the second
    // update below (clearing the sentinel flag) ran, so the UI showed
    // "disconnected" while Kith retained full working Calendar access.
    await deleteTokensFromVault(therapist.id);
    const serviceClient = createServiceRoleClient();
    await serviceClient
      .from('therapists')
      .update({ google_calendar_vault_secret_id: null })
      .eq('id', therapist.id);
  }

  return NextResponse.json({ ok: true });
}
