/**
 * GET /api/cron/send-appointment-reminders
 *
 * Sends a reminder email ~10 hours before an appointment starts. The instant
 * "booked!" email already goes out at creation time (see
 * app/api/appointments/route.ts) — this is the follow-up reminder for
 * "the rest of the time" as the session approaches.
 *
 * NOT triggered by Vercel Cron: this project is on a Hobby plan, which only
 * allows a cron to fire once a day — nowhere near frequent enough to catch a
 * 10-hour-out window for appointments scattered across the day. Instead this
 * is polled externally every ~15 min (see .github/workflows/appointment-reminders.yml),
 * which isn't subject to Vercel's own Cron Jobs limits since it's just a
 * regular authenticated HTTP request, identical in shape to any webhook.
 *
 * Ultra/clinic only, matching entitlements.patientMessaging — same tier that
 * already gets the instant booking email and the "Message patient" feature.
 */
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getEntitlements } from '@/lib/entitlements';
import { sendNotification } from '@/lib/notify';
import { buildCalendarInvite } from '@/lib/ics';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const REMINDER_LEAD_HOURS = 10;
// Half-width of the window checked each run. Must be >= half the polling
// interval (15 min) so back-to-back runs can't both skip an appointment that
// lands between two checks; reminder_sent_at prevents double-sends if the
// windows overlap instead.
const WINDOW_MINUTES = 20;
const MAX_PER_RUN = 25;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceRoleClient();
  const target = new Date(Date.now() + REMINDER_LEAD_HOURS * 60 * 60_000);
  const windowStart = new Date(target.getTime() - WINDOW_MINUTES * 60_000).toISOString();
  const windowEnd = new Date(target.getTime() + WINDOW_MINUTES * 60_000).toISOString();

  const { data: appts, error } = await service
    .from('appointments')
    .select('id, therapist_id, patient_id, scheduled_at, duration_minutes, modality, meeting_url')
    .in('status', ['scheduled', 'confirmed'])
    .is('reminder_sent_at', null)
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd)
    .limit(MAX_PER_RUN);

  if (error) {
    console.error('[Kith] send-appointment-reminders query failed:', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let sent = 0, skipped = 0;

  for (const appt of appts ?? []) {
    try {
      const [{ data: therapist }, { data: patient }] = await Promise.all([
        service.from('therapists').select('display_name, subscription_plan, subscription_status, trial_ends_at, email').eq('id', appt.therapist_id).single(),
        service.from('patients').select('display_name, email').eq('id', appt.patient_id).single(),
      ]);

      // Ultra/clinic only — mirrors the instant booking-notification gate.
      if (!therapist || !getEntitlements(therapist).patientMessaging) { skipped++; continue; }
      if (!patient?.email) { skipped++; continue; }

      const when = new Date(appt.scheduled_at).toLocaleString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
      });
      const therapistName = therapist.display_name || 'your therapist';
      const isVideo = appt.modality === 'video' && appt.meeting_url;
      const message = isVideo
        ? `Hi ${patient.display_name}, reminder: your online session with ${therapistName} is coming up on ${when}. Join here: ${appt.meeting_url}`
        : `Hi ${patient.display_name}, reminder: your session with ${therapistName} is coming up on ${when}.`;

      const icsAttachment = buildCalendarInvite({
        uid: appt.id,
        sequence: 1,
        title: `Therapy session with ${therapistName}`,
        description: isVideo ? `Join link: ${appt.meeting_url}` : undefined,
        location: isVideo ? appt.meeting_url : undefined,
        start: new Date(appt.scheduled_at),
        durationMinutes: appt.duration_minutes || 50,
        organizerEmail: therapist.email || process.env.RESEND_FROM_EMAIL || 'noreply@kith.space',
        organizerName: therapistName,
        attendeeEmail: patient.email,
        attendeeName: patient.display_name,
      });

      const result = await sendNotification({
        to: { email: patient.email },
        subject: `Reminder: your session with ${therapistName}`,
        message,
        channels: ['email'],
        icsAttachment,
      });

      // Only mark sent on actual success — a transient Resend failure should
      // let the next poll retry rather than silently losing the reminder.
      if (result.email) {
        await service.from('appointments').update({ reminder_sent_at: new Date().toISOString() }).eq('id', appt.id);
        sent++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`[Kith] send-appointment-reminders: appointment ${appt.id} failed:`, err);
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, checked: appts?.length ?? 0, sent, skipped });
}
