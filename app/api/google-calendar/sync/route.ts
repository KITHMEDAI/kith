import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getTokensFromVault, storeTokensInVault, syncCalendarAppointments } from '@/lib/google-calendar';
import { matchOrCreatePatient, type PatientFields } from '@/lib/patient-match';
import type { calendar_v3 } from 'googleapis';

// Strip scheduling boilerplate from an event title to recover the patient's name.
// "Therapy session with John Doe" → "John Doe", "Anita Rao - CBT" → "Anita Rao".
function nameFromSummary(summary?: string | null): string {
  if (!summary) return '';
  let s = summary.split(/[-–—|:]/)[0].trim().length > 2 ? summary.split(/[-–—|:]/)[0] : summary;
  s = s.replace(/\b(therapy|counsel(l)?ing|session|appointment|appt|consult(ation)?|follow[- ]?up|review|intake|meeting|call|with|for|re:)\b/gi, '');
  return s.replace(/\s{2,}/g, ' ').trim();
}

function phoneFromText(text?: string | null): string | null {
  if (!text) return null;
  const m = text.match(/(\+?\d[\d\s().-]{7,}\d)/);
  return m ? m[1].trim() : null;
}

// Recover the video-call join link so a Recall bot can join online sessions.
// Meet → hangoutLink / conferenceData; Teams → conferenceData entry point or a
// teams.microsoft.com link in the description/location.
function meetingUrlFromEvent(e: calendar_v3.Schema$Event): string | null {
  const video = e.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri;
  if (video) return video;
  if (e.hangoutLink) return e.hangoutLink;
  const text = `${e.location || ''} ${e.description || ''}`;
  const m = text.match(/https?:\/\/[^\s)]*(teams\.microsoft\.com|meet\.google\.com|zoom\.us)[^\s)]*/i);
  return m ? m[0] : null;
}

// Pull whatever patient info an event exposes (attendees, title, description).
function extractPatient(e: calendar_v3.Schema$Event): PatientFields | null {
  const attendee = (e.attendees || []).find(a => !a.organizer && !a.self && a.email);
  const email = attendee?.email || null;
  const name =
    attendee?.displayName?.trim() ||
    nameFromSummary(e.summary) ||
    (email ? email.split('@')[0] : '');
  if (!name || name.length < 2) return null;

  return {
    display_name: name,
    email,
    phone: phoneFromText(e.description) || phoneFromText(e.location),
    presenting_concerns: e.description?.slice(0, 500) || null,
    imported_from: 'google_calendar',
  };
}

export async function POST() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    return NextResponse.json({ error: 'Google Calendar tokens missing — please reconnect in Settings.' }, { status: 400 });
  }

  let events, refreshedTokens;
  try {
    ({ events, refreshedTokens } = await syncCalendarAppointments(tokens));
  } catch (err) {
    console.error('[google-calendar/sync]', err);
    return NextResponse.json({ error: 'Could not reach Google Calendar — please reconnect and try again.' }, { status: 502 });
  }

  if (refreshedTokens.access_token !== tokens.access_token) {
    await storeTokensInVault(therapist.id, refreshedTokens);
  }

  const serviceClient = createServiceRoleClient();

  // Only timed events (all-day events have start.date, not start.dateTime)
  const timed = events.filter(e => e.start?.dateTime && e.id);
  const ids = timed.map(e => e.id!);

  // Which events are already imported as appointments?
  let existingIds = new Set<string>();
  if (ids.length) {
    const { data: existing } = await serviceClient
      .from('appointments')
      .select('google_event_id')
      .eq('therapist_id', therapist.id)
      .in('google_event_id', ids);
    existingIds = new Set((existing ?? []).map(r => r.google_event_id as string));
  }

  let patientsCreated = 0, patientsUpdated = 0, appointmentsAdded = 0;

  for (const e of timed) {
    if (existingIds.has(e.id!)) continue;

    // Map the event to a patient (match existing or create new)
    let patientId: string | null = null;
    const fields = extractPatient(e);
    if (fields) {
      try {
        const res = await matchOrCreatePatient(serviceClient, therapist.id, fields);
        patientId = res.id;
        if (res.action === 'created') patientsCreated++; else patientsUpdated++;
      } catch (err) {
        console.error('[google-calendar/sync] patient', err);
      }
    }

    const start = e.start!.dateTime!;
    const end = e.end?.dateTime;
    const mins = end
      ? Math.max(15, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000))
      : 50;
    const title = e.summary || 'Google Calendar event';
    const meetingUrl = meetingUrlFromEvent(e);

    const { error: insErr } = await serviceClient.from('appointments').insert({
      therapist_id: therapist.id,
      patient_id: patientId,
      scheduled_at: start,
      duration_minutes: mins,
      status: 'scheduled',
      modality: meetingUrl ? 'video' : 'in_person',
      meeting_url: meetingUrl,
      notes: e.description ? `${title} — ${e.description}` : title,
      google_event_id: e.id,
    });
    if (!insErr) appointmentsAdded++;
    else console.error('[google-calendar/sync] insert', insErr);
  }

  return NextResponse.json({
    synced: appointmentsAdded,
    found: ids.length,
    skipped: ids.length - appointmentsAdded,
    patientsCreated,
    patientsUpdated,
  });
}
