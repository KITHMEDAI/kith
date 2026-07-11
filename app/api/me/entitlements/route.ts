import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getEntitlements } from '@/lib/entitlements';

// GET /api/me/entitlements — lets client UI (booking dialog, integrations
// page, billing page) know what the doctor's current plan actually unlocks,
// without each component re-deriving the trial/active/free logic itself.
export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists')
    .select('subscription_plan, subscription_status, trial_ends_at, google_calendar_vault_secret_id')
    .eq('user_id', user.id)
    .single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    ...getEntitlements(therapist),
    // Plan-unlocked (autoMeetAndInvite) isn't the same as actually wired up —
    // without this the UI can promise "Kith will create a Meet" when Google
    // Calendar was never successfully connected, and the doctor only finds
    // out later when no email arrives.
    googleCalendarConnected: !!therapist.google_calendar_vault_secret_id,
  });
}
