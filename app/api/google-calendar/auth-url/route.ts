import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUrl } from '@/lib/google-calendar';
import { getEntitlements, upgradeMessage } from '@/lib/entitlements';

export async function GET(req: NextRequest) {
  // state = therapist ID if logged in, or a temp token during registration
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let state = 'pending'; // fallback for registration flow (not yet logged in)

  const from = req.nextUrl.searchParams.get('from') ?? '';

  if (user) {
    const { data: therapist } = await supabase
      .from('therapists').select('id, subscription_plan, subscription_status, trial_ends_at, cancel_at').eq('user_id', user.id).single();
    if (therapist) {
      state = from ? `${therapist.id}|${from}` : therapist.id;
      // Free-tier doctors connecting from Settings (not the registration/onboarding
      // flow, where `from` is set) are gated — onboarding intentionally stays open
      // so a brand-new sign-up can still try the connect flow during their trial.
      if (!from && !getEntitlements(therapist).calendarSync) {
        return NextResponse.json({ error: upgradeMessage('Google Calendar sync'), code: 'PLAN_LOCKED' }, { status: 402 });
      }
    }
  }

  try {
    // Auto-fill the Google account with the email the doctor signed up with,
    // so they never have to pick or re-type which account to connect.
    const url = getAuthUrl(state, user?.email ?? undefined);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[google-calendar/auth-url]', err);
    return NextResponse.json(
      { error: 'Google Calendar not configured — check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local' },
      { status: 503 }
    );
  }
}
