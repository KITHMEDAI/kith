/**
 * lib/ics.ts
 *
 * Minimal iCalendar (.ics) generator for appointment emails. Attaching a real
 * calendar invite (not just a sentence mentioning the time) lets Gmail/Outlook
 * render an "Add to Calendar" / RSVP widget directly in the email, and lets
 * the patient add it to Google Calendar with one click — regardless of
 * whether the therapist has Google Calendar connected on their own end.
 */

function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Folds long lines per RFC 5545 (lines must be ≤75 octets, continued with a
// leading space) — without this, some calendar clients truncate long
// SUMMARY/DESCRIPTION/LOCATION values.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  chunks.push(rest);
  return chunks.join('\r\n');
}

export interface CalendarInviteParams {
  /** Stable across updates to the same appointment — use the appointment's own id. */
  uid: string;
  /** Bump on reschedule so calendar apps treat it as an update, not a duplicate. */
  sequence: number;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  durationMinutes: number;
  organizerEmail: string;
  organizerName: string;
  attendeeEmail?: string;
  attendeeName?: string;
  /** 'CANCEL' removes the event from the attendee's calendar (used on cancellation). */
  method?: 'REQUEST' | 'CANCEL';
}

export function buildCalendarInvite(p: CalendarInviteParams): { filename: string; content: string; contentType: string } {
  const method = p.method || 'REQUEST';
  const end = new Date(p.start.getTime() + p.durationMinutes * 60000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kith//Appointment//EN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${p.uid}@kith.space`,
    `SEQUENCE:${p.sequence}`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(p.start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${icsEscape(p.title)}`,
    ...(p.description ? [`DESCRIPTION:${icsEscape(p.description)}`] : []),
    ...(p.location ? [`LOCATION:${icsEscape(p.location)}`] : []),
    `ORGANIZER;CN=${icsEscape(p.organizerName)}:mailto:${p.organizerEmail}`,
    ...(p.attendeeEmail
      ? [`ATTENDEE;CN=${icsEscape(p.attendeeName || 'Patient')};RSVP=TRUE:mailto:${p.attendeeEmail}`]
      : []),
    `STATUS:${method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return {
    filename: method === 'CANCEL' ? 'cancellation.ics' : 'invite.ics',
    content: lines.map(foldLine).join('\r\n') + '\r\n',
    contentType: `text/calendar; charset=utf-8; method=${method}`,
  };
}
