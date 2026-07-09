import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendRescheduleNotification } from '@/lib/notify';
import { buildCalendarInvite } from '@/lib/ics';
import { z } from 'zod';

// Accept both snake_case (API-native) and camelCase (what the modal historically
// sent) so a field-name mismatch can never silently 422 the request again.
const RescheduleSchema = z
  .object({
    appointment_id: z.string().uuid().optional(),
    appointmentId: z.string().uuid().optional(),
    new_datetime: z.string().datetime().optional(),
    newDateTime: z.string().datetime().optional(),
    reason: z.string().optional(),
    channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).default([]),
    message: z.string().optional(),
  })
  .transform(d => ({
    appointment_id: d.appointment_id || d.appointmentId,
    new_datetime: d.new_datetime || d.newDateTime,
    reason: d.reason,
    channels: d.channels,
    message: d.message,
  }))
  .refine(d => d.appointment_id && d.new_datetime, { message: 'appointment_id and new_datetime are required' });

function overlaps(aStartMs: number, aDurMin: number, bStartMs: number, bDurMin: number) {
  return aStartMs < bStartMs + bDurMin * 60000 && bStartMs < aStartMs + aDurMin * 60000;
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists')
    .select('id, display_name, clinic_name, email')
    .eq('user_id', user.id)
    .single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = RescheduleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { appointment_id, new_datetime, reason, channels, message } = parsed.data;

  // Fetch the appointment (with its duration + patient contact for the notice)
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, scheduled_at, duration_minutes, modality, meeting_url, patient:patients(display_name, email, phone, whatsapp_number)')
    .eq('id', appointment_id!)
    .eq('therapist_id', therapist.id)
    .single();

  if (!appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

  const dur = appt.duration_minutes || 50;
  const newMs = new Date(new_datetime!).getTime();

  // Conflict check — the new slot must not overlap another active appointment.
  const windowStart = new Date(newMs - 4 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(newMs + 4 * 60 * 60 * 1000).toISOString();
  const { data: nearby } = await supabase
    .from('appointments')
    .select('id, scheduled_at, duration_minutes, patient:patients(display_name)')
    .eq('therapist_id', therapist.id)
    .neq('status', 'cancelled')
    .neq('id', appointment_id!)
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd);

  const clash = (nearby || []).find(b =>
    overlaps(newMs, dur, new Date(b.scheduled_at).getTime(), b.duration_minutes || 50),
  );
  if (clash) {
    const cp = Array.isArray(clash.patient) ? clash.patient[0] : clash.patient;
    return NextResponse.json(
      { error: 'time_conflict', conflict: { conflictsWith: cp?.display_name || 'another appointment', conflictAt: clash.scheduled_at } },
      { status: 409 },
    );
  }

  // Update — keep status 'scheduled' (a valid CHECK value; 'rescheduled' is NOT
  // in the DB constraint and would silently fail). Record the reason in notes.
  const { error: updErr } = await supabase
    .from('appointments')
    .update({ scheduled_at: new_datetime, status: 'scheduled', notes: reason || null })
    .eq('id', appointment_id!)
    .eq('therapist_id', therapist.id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Best-effort patient notification (never blocks the reschedule)
  let notifications = null;
  if (channels.length > 0) {
    const patient = (Array.isArray(appt.patient) ? appt.patient[0] : appt.patient) as
      | { display_name: string; email: string; phone: string; whatsapp_number: string }
      | null;
    const therapistName = therapist.display_name || 'your therapist';
    const icsAttachment = buildCalendarInvite({
      uid: appt.id,
      sequence: 1,
      title: `Therapy session with ${therapistName}`,
      description: appt.meeting_url ? `Join link: ${appt.meeting_url}` : undefined,
      location: appt.meeting_url || undefined,
      start: new Date(new_datetime!),
      durationMinutes: appt.duration_minutes || 50,
      organizerEmail: therapist.email || process.env.RESEND_FROM_EMAIL || 'noreply@kith.space',
      organizerName: therapistName,
      attendeeEmail: patient?.email || undefined,
      attendeeName: patient?.display_name,
    });
    notifications = await sendRescheduleNotification({
      patient: {
        display_name: patient?.display_name || 'Patient',
        email: patient?.email,
        phone: patient?.phone,
        whatsapp_number: patient?.whatsapp_number,
      },
      oldTime: appt.scheduled_at,
      newTime: new_datetime!,
      message,
      channels,
      icsAttachment,
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, appointment: { id: appointment_id, scheduled_at: new_datetime, status: 'scheduled' }, notifications });
}
