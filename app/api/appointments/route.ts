import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createMeetEvent, getTokensFromVault } from '@/lib/google-calendar';
import { getEntitlements, upgradeMessage } from '@/lib/entitlements';
import { sendNotification } from '@/lib/notify';
import { buildCalendarInvite } from '@/lib/ics';
import { addWeeks, addMonths } from 'date-fns';
import { z } from 'zod';

// Google RRULE for a recurring booking (one event/Meet link covers the series).
function rruleFor(frequency: string, count: number): string {
  if (frequency === 'biweekly') return `RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=${count}`;
  if (frequency === 'monthly') return `RRULE:FREQ=MONTHLY;COUNT=${count}`;
  return `RRULE:FREQ=WEEKLY;COUNT=${count}`;
}

const RecurrenceSchema = z
  .object({
    frequency: z.enum(['weekly', 'biweekly', 'monthly']),
    count: z.number().int().min(2).max(52),
  })
  .optional()
  .nullable();

const CreateSchema = z.object({
  patient_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().int().min(15).max(240).default(50),
  session_type: z.enum(['individual', 'couples', 'group', 'family']).default('individual'),
  modality: z.enum(['in_person', 'video']).default('in_person'),
  goals: z.string().optional(),
  notes: z.string().optional(),
  meeting_url: z.string().url().optional().nullable(),
  recurrence: RecurrenceSchema,
  immediate: z.boolean().optional(), // true = ad-hoc "start now", skip conflict check
});

interface BusyAppt {
  id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  patient?: { display_name?: string } | { display_name?: string }[] | null;
}

// Two intervals overlap iff each starts before the other ends.
function overlaps(aStartMs: number, aDurMin: number, bStartMs: number, bDurMin: number) {
  const aEnd = aStartMs + aDurMin * 60000;
  const bEnd = bStartMs + bDurMin * 60000;
  return aStartMs < bEnd && bStartMs < aEnd;
}

function patientName(a: BusyAppt): string {
  const p = Array.isArray(a.patient) ? a.patient[0] : a.patient;
  return p?.display_name || 'another appointment';
}

// Build the list of occurrence Date objects for a (possibly recurring) booking.
function buildOccurrences(startISO: string, rec: { frequency: string; count: number } | null | undefined): Date[] {
  const start = new Date(startISO);
  if (!rec) return [start];
  const out: Date[] = [];
  for (let i = 0; i < rec.count; i++) {
    if (rec.frequency === 'weekly') out.push(addWeeks(start, i));
    else if (rec.frequency === 'biweekly') out.push(addWeeks(start, i * 2));
    else out.push(addMonths(start, i));
  }
  return out;
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists')
    .select('id, subscription_plan, subscription_status, trial_ends_at')
    .eq('user_id', user.id)
    .single();
  if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const entitlements = getEntitlements(therapist);
  if (parsed.data.modality === 'video' && !entitlements.onlineSessions) {
    return NextResponse.json({ error: upgradeMessage('online sessions'), code: 'PLAN_LOCKED' }, { status: 402 });
  }
  if (parsed.data.session_type !== 'individual' && !entitlements.groupSessionTypes) {
    return NextResponse.json({ error: 'Upgrade to Pro or Ultra to unlock couples, family, and group session types.', code: 'PLAN_LOCKED' }, { status: 402 });
  }

  const { patient_id, scheduled_at, duration_minutes, session_type, modality, goals, notes, meeting_url, recurrence, immediate } = parsed.data;

  const occurrences = buildOccurrences(scheduled_at, recurrence);
  const toInsert: { at: Date }[] = [];
  const skipped: { scheduled_at: string; conflictsWith: string; conflictAt: string }[] = [];

  // Immediate ("start now") sessions skip the conflict check — the therapist is
  // intentionally starting an ad-hoc session and shouldn't be blocked by a
  // stale or in-progress appointment from earlier in the day.
  if (!immediate) {
    const startMs = occurrences.map(d => d.getTime());
    const windowStart = new Date(Math.min(...startMs) - 4 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(Math.max(...startMs) + 4 * 60 * 60 * 1000).toISOString();

    const { data: existing } = await supabase
      .from('appointments')
      .select('id, scheduled_at, duration_minutes, patient:patients(display_name)')
      .eq('therapist_id', therapist.id)
      .not('status', 'in', '["cancelled","in_session","completed"]')
      .gte('scheduled_at', windowStart)
      .lte('scheduled_at', windowEnd);

    const busy = (existing || []) as BusyAppt[];

    for (const at of occurrences) {
      const clash = busy.find(b =>
        overlaps(at.getTime(), duration_minutes, new Date(b.scheduled_at).getTime(), b.duration_minutes || 50),
      );
      if (clash) {
        skipped.push({ scheduled_at: at.toISOString(), conflictsWith: patientName(clash), conflictAt: clash.scheduled_at });
      } else {
        toInsert.push({ at });
      }
    }

    // Single (non-recurring) booking that collides → hard 409 so the UI can warn.
    if (!recurrence && toInsert.length === 0) {
      return NextResponse.json(
        { error: 'time_conflict', conflict: skipped[0] },
        { status: 409 },
      );
    }
  } else {
    occurrences.forEach(at => toInsert.push({ at }));
  }

  // ── Auto-create a Google Meet for online (video) sessions ──────────────────
  // A manually-pasted meeting_url always wins. Otherwise, if the therapist is
  // Ultra+ and has Google connected, Kith creates the Meet (one event/link for
  // a recurring series) and auto-emails the patient the join link — see the
  // notification block below. Pro can still book video sessions, just with a
  // manually-pasted link (no auto-create, no auto-email — that's the Ultra
  // automation). Failures never block the booking — we just flag a warning so
  // the doctor can add a link later from the appointment.
  let resolvedMeetingUrl: string | null = meeting_url || null;
  let googleEventId: string | null = null;
  let meetWarning: string | null = null;

  if (modality === 'video' && !resolvedMeetingUrl && toInsert.length > 0) {
    if (!entitlements.autoMeetAndInvite) {
      meetWarning = 'Automatic Meet creation is an Ultra feature — paste your own Teams/Zoom/Meet link above, or upgrade to have Kith create and send one automatically.';
    } else {
      const { data: pt } = await supabase
        .from('patients').select('display_name, email').eq('id', patient_id).single();

      // Strict, at point of use: the whole point of this feature is emailing
      // the patient the link, so refuse to silently create a Meet nobody
      // receives — the therapist would only find out when the patient asks
      // "how do I join?". Pro/Free never hit this (no auto-create for them).
      if (!pt?.email) {
        return NextResponse.json(
          { error: 'This patient needs an email on file before Kith can auto-create and send the Meet link. Add one and try again.', code: 'EMAIL_REQUIRED' },
          { status: 422 },
        );
      }

      try {
        const tokens = await getTokensFromVault(therapist.id); // throws if not connected
        const meet = await createMeetEvent(tokens, {
          summary: `Therapy session — ${pt?.display_name || 'Patient'}`,
          description: goals ? `Session focus: ${goals}` : undefined,
          startISO: toInsert[0].at.toISOString(),
          durationMin: duration_minutes,
          attendees: pt?.email ? [{ email: pt.email }] : undefined,
          recurrenceRule: recurrence ? rruleFor(recurrence.frequency, recurrence.count) : null,
        });
        resolvedMeetingUrl = meet.meetingUrl;
        googleEventId = meet.eventId;
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        meetWarning = /tokens found|reconnect/i.test(msg)
          ? 'Connect Google Calendar in Settings to auto-create Meet links — or paste a link when booking.'
          : 'Booked, but Kith could not create a Google Meet right now. Add a link from the appointment to enable the notetaker.';
      }
    }
  }

  let createdIds: string[] = [];
  if (toInsert.length > 0) {
    const rows = toInsert.map(({ at }) => ({
      therapist_id: therapist.id,
      patient_id,
      scheduled_at: at.toISOString(),
      duration_minutes,
      session_type,
      modality,
      goals,
      notes,
      meeting_url: resolvedMeetingUrl,
      google_event_id: googleEventId,
      status: 'scheduled',
    }));
    const { data, error } = await supabase.from('appointments').insert(rows).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    createdIds = (data || []).map(d => d.id);

    // Auto-notify the patient with the session time + join link, right away.
    // Ultra-only, in line with entitlements.autoMeetAndInvite above — Pro can
    // still book a video session with its own pasted link, but automatically
    // messaging the patient on the therapist's behalf is the Ultra automation.
    if (modality === 'video' && resolvedMeetingUrl && createdIds.length > 0 && entitlements.autoMeetAndInvite) {
      try {
        const [{ data: pt }, { data: therapistInfo }] = await Promise.all([
          supabase.from('patients').select('display_name, phone, whatsapp_number, email').eq('id', patient_id).single(),
          supabase.from('therapists').select('display_name, email').eq('id', therapist.id).single(),
        ]);
        if (pt) {
          const firstTime = toInsert[0].at.toLocaleString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
          });
          const recurringNote = recurrence ? ` (repeats ${recurrence.frequency})` : '';
          const therapistName = therapistInfo?.display_name || 'your therapist';
          const message = `Hi ${pt.display_name}, your online session with ${therapistName} is booked for ${firstTime}${recurringNote}. Join here: ${resolvedMeetingUrl}`;
          // Attaches a real calendar invite so the patient gets an "Add to
          // Calendar" prompt in their email client, regardless of whether the
          // therapist has Google Calendar connected on their own end.
          const icsAttachment = buildCalendarInvite({
            uid: createdIds[0],
            sequence: 0,
            title: `Therapy session with ${therapistName}`,
            description: `Join link: ${resolvedMeetingUrl}`,
            location: resolvedMeetingUrl,
            start: toInsert[0].at,
            durationMinutes: duration_minutes,
            organizerEmail: therapistInfo?.email || process.env.RESEND_FROM_EMAIL || 'noreply@kith.space',
            organizerName: therapistName,
            attendeeEmail: pt.email || undefined,
            attendeeName: pt.display_name,
          });
          await sendNotification({
            to: {
              email: pt.email || undefined,
              phone: pt.phone || undefined,
              whatsapp: pt.whatsapp_number || pt.phone || undefined,
            },
            subject: 'Your online session — Kith',
            message,
            // WhatsApp deprioritized for now — sandbox-only until Twilio's
            // business verification is approved (see MessagePatientButton.tsx).
            channels: ['email'],
            icsAttachment,
          });
        }
      } catch (err) {
        console.error('[appointments] booking notification failed:', err);
      }
    }
  }

  return NextResponse.json(
    {
      id: createdIds[0],          // back-compat for single-booking callers
      created: createdIds.length,
      ids: createdIds,
      skipped,
      total: occurrences.length,
      meeting_url: resolvedMeetingUrl,
      meet_warning: meetWarning,
    },
    { status: 201 },
  );
}

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let query = supabase
    .from('appointments')
    .select('*, patient:patients(display_name, phone, email)')
    .eq('therapist_id', therapist.id)
    .order('scheduled_at', { ascending: true });

  if (status) query = query.eq('status', status);
  if (from) query = query.gte('scheduled_at', from);
  if (to) query = query.lte('scheduled_at', to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
