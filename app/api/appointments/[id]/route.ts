import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTokensFromVault, deleteCalendarEvent } from '@/lib/google-calendar';

// 'rescheduled' is NOT a valid value in the DB CHECK constraint
// (supabase/migrations/001_full_schema.sql) — a direct PATCH with that
// status used to pass this list then 500 at the DB. The real reschedule
// route (reschedule/route.ts) correctly sets 'scheduled' instead.
const VALID_STATUSES = ['scheduled', 'confirmed', 'in_session', 'completed', 'cancelled', 'no_show'];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { status, notes, scheduled_at, duration_minutes, meeting_url } = body;

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 422 });
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (scheduled_at) updates.scheduled_at = scheduled_at;
  if (duration_minutes) updates.duration_minutes = duration_minutes;
  if (meeting_url !== undefined) updates.meeting_url = meeting_url;

  const { error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', params.id)
    .eq('therapist_id', therapist.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Note the linked Google event before cancelling, so we can clean it up.
  const { data: appt } = await supabase
    .from('appointments').select('google_event_id')
    .eq('id', params.id).eq('therapist_id', therapist.id).single();

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', params.id)
    .eq('therapist_id', therapist.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort: delete the Google Meet event, but ONLY if no other active
  // appointment still references it (a recurring series shares one event).
  const eventId = appt?.google_event_id as string | null;
  if (eventId) {
    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('therapist_id', therapist.id)
      .eq('google_event_id', eventId)
      .neq('status', 'cancelled');
    if ((count ?? 0) === 0) {
      try {
        const tokens = await getTokensFromVault(therapist.id);
        await deleteCalendarEvent(tokens, eventId);
      } catch { /* not connected / already removed — ignore */ }
    }
  }

  return NextResponse.json({ ok: true });
}
