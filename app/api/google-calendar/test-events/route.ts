import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTokensFromVault, storeTokensInVault, createCalendarEvent } from '@/lib/google-calendar';

// ── DEV / TEST ONLY ──────────────────────────────────────────────────────────
// Creates 3 sample events in the CONNECTED Google Calendar (the account you
// linked during onboarding) using Kith's stored OAuth tokens. Lets you verify
// the calendar sync without manually creating events. Visit this URL while
// logged in, then go to Appointments → "Sync Google Calendar".
export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized — sign in first' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists')
    .select('id, google_calendar_vault_secret_id')
    .eq('user_id', user.id)
    .single();

  if (!therapist?.google_calendar_vault_secret_id) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 });
  }

  let tokens;
  try {
    tokens = await getTokensFromVault(therapist.id);
  } catch {
    return NextResponse.json({ error: 'Tokens missing — please reconnect Google Calendar in Settings.' }, { status: 400 });
  }

  const now = Date.now();
  const specs = [
    { summary: 'Kith test — Session in 1 hour', offsetMin: 60 },
    { summary: 'Kith test — Session tomorrow',  offsetMin: 60 * 24 },
    { summary: 'Kith test — Session in 2 days',  offsetMin: 60 * 48 },
  ];

  const created: { id: string | null | undefined; summary: string; start: string }[] = [];
  let current = tokens;

  try {
    for (const s of specs) {
      const start = new Date(now + s.offsetMin * 60_000);
      const end = new Date(start.getTime() + 50 * 60_000);
      const { event, refreshedTokens } = await createCalendarEvent(current, {
        summary: s.summary,
        description: 'Created by Kith to test Google Calendar sync.',
        start: start.toISOString(),
        end: end.toISOString(),
      });
      current = refreshedTokens;
      created.push({ id: event.id, summary: s.summary, start: start.toISOString() });
    }

    if (current.access_token !== tokens.access_token) {
      await storeTokensInVault(therapist.id, current);
    }
  } catch (err) {
    console.error('[google-calendar/test-events]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create events', created },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Created ${created.length} events in your connected Google Calendar. Now open Appointments → Sync Google Calendar.`,
    created,
  });
}
