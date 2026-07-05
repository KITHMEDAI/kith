import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, storeTokensInVault } from '@/lib/google-calendar';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const rawState = url.searchParams.get('state') ?? '';
  const [therapistId, fromPage] = rawState.includes('|') ? rawState.split('|') : [rawState, ''];
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';

  // Where to send the user on failure / cancellation — keep them in the flow they started from.
  const failRedirect = fromPage === 'onboarding'
    ? `${base}/onboarding?calendar=error`
    : `${base}/settings/integrations?error=token_exchange_failed`;

  // No code = user cancelled at the Google consent / "unverified app" screen (or an error param).
  if (!code) {
    return NextResponse.redirect(failRedirect);
  }

  // state = 'pending' means OAuth was triggered before account creation (registration flow)
  // Can't store tokens yet — send to onboarding where they are logged in
  if (!therapistId || therapistId === 'pending') {
    return NextResponse.redirect(`${base}/onboarding?info=connect_calendar`);
  }

  // SECURITY: `state` is just a URL query param round-tripped through Google —
  // fully attacker-forgeable (anyone can GET this endpoint directly with any
  // therapistId in `state`). Require the actual logged-in session to match
  // the therapist named in state before writing anything, so an attacker
  // can't hijack another therapist's calendar-connection slot with their own
  // OAuth code just by crafting the URL.
  const authClient = createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.redirect(failRedirect);
  const { data: sessionTherapist } = await authClient
    .from('therapists').select('id').eq('user_id', user.id).single();
  if (!sessionTherapist || sessionTherapist.id !== therapistId) {
    return NextResponse.redirect(failRedirect);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(failRedirect);
    }

    const vaultId = await storeTokensInVault(therapistId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date || Date.now() + 3600000,
    });

    const supabase = createServiceRoleClient();
    await supabase
      .from('therapists')
      .update({ google_calendar_vault_secret_id: vaultId })
      .eq('id', therapistId);

    // Redirect back to onboarding if that's where the flow started
    if (fromPage === 'onboarding') {
      return NextResponse.redirect(`${base}/onboarding?calendar=connected`);
    }
    return NextResponse.redirect(`${base}/dashboard?connected=google_calendar`);
  } catch (err) {
    console.error('[google-calendar/callback]', err);
    // Send the user back to where they started with a clean error param.
    return NextResponse.redirect(failRedirect);
  }
}
