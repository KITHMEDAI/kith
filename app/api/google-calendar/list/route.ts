import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getTokensFromVault, storeTokensInVault, listCalendars } from '@/lib/google-calendar';

// GET /api/google-calendar/list — the connected account's calendars, so the
// doctor can pick which one to sync appointments from.
export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists')
    .select('id, google_calendar_vault_secret_id, google_calendar_id')
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

  try {
    const { calendars, refreshedTokens } = await listCalendars(tokens);
    if (refreshedTokens.access_token !== tokens.access_token) {
      await storeTokensInVault(therapist.id, refreshedTokens);
    }
    return NextResponse.json({ calendars, selected: therapist.google_calendar_id || 'primary' });
  } catch (err) {
    console.error('[google-calendar/list]', err);
    return NextResponse.json({ error: 'Could not fetch calendar list' }, { status: 502 });
  }
}

// PATCH /api/google-calendar/list — save which calendar to sync from.
export async function PATCH(req: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { calendarId } = await req.json().catch(() => ({}));
  if (!calendarId || typeof calendarId !== 'string') {
    return NextResponse.json({ error: 'calendarId required' }, { status: 422 });
  }

  const service = createServiceRoleClient();
  const { error } = await service
    .from('therapists').update({ google_calendar_id: calendarId }).eq('id', therapist.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
