import { google } from 'googleapis';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/encryption';

type GoogleTokens = { access_token: string; refresh_token: string; expiry_date: number };

// At-rest encryption for the OAuth tokens (refresh tokens grant ongoing calendar
// access — the most sensitive secret we persist). Encrypts only when
// ENCRYPTION_SECRET is configured; otherwise stores plaintext as before.
// Reads auto-detect the shape, so existing plaintext rows keep working.
function serializeTokens(tokens: GoogleTokens): unknown {
  if (process.env.ENCRYPTION_SECRET) {
    try { return { enc: encrypt(JSON.stringify(tokens)) }; } catch { /* fall through to plaintext */ }
  }
  return tokens;
}
function deserializeTokens(stored: unknown): GoogleTokens {
  if (stored && typeof stored === 'object' && typeof (stored as { enc?: unknown }).enc === 'string') {
    return JSON.parse(decrypt((stored as { enc: string }).enc));
  }
  return stored as GoogleTokens;
}

// A fresh client per call, not a shared module-level singleton — every
// helper below calls setCredentials() right before an async Google API call,
// and Node can interleave requests from two different therapists on the same
// warm server instance. With one shared client, therapist A's in-flight
// request could have its credentials overwritten by therapist B's
// setCredentials() before A's own async call resolves, executing A's
// request against Google using B's tokens — a real cross-tenant calendar
// leak/write, not just a theoretical race. A fresh instance per call makes
// that impossible since there's nothing shared left to interleave.
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(state: string, loginHint?: string): string {
  // Make consent auto-grant configurable: forcing `prompt: 'consent'` always shows
  // the consent screen (and reliably returns a refresh_token). In production we can
  // flip GOOGLE_AUTO_CONSENT=true to drop the forced prompt so Google skips the screen
  // for accounts that have already granted these scopes.
  const autoConsent = process.env.GOOGLE_AUTO_CONSENT === 'true';

  return createOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state,
    // Pre-select the doctor's signup email so Google skips the account chooser
    // and never asks which account to use.
    ...(loginHint ? { login_hint: loginHint } : {}),
    // Carry over scopes the user has already granted to this app.
    include_granted_scopes: true,
    ...(autoConsent ? {} : { prompt: 'consent' }),
  });
}

export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await createOAuth2Client().getToken(code);
  return tokens;
}

// ── Token storage (direct DB column — Vault can be enabled later) ─────────────
// Tokens stored in therapists.google_calendar_tokens (JSONB).
// The legacy google_calendar_vault_secret_id column is kept for compatibility.

export async function storeTokensInVault(
  therapistId: string,
  tokens: { access_token: string; refresh_token: string; expiry_date: number }
): Promise<string> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('therapists')
    .update({
      google_calendar_tokens: serializeTokens(tokens),
      // also set the legacy column to a non-null sentinel so "connected" checks work
      google_calendar_vault_secret_id: `direct_${therapistId}`,
    })
    .eq('id', therapistId);
  if (error) throw new Error(`Failed to store tokens: ${error.message}`);
  return `direct_${therapistId}`;
}

export async function getTokensFromVault(
  therapistId: string
): Promise<{ access_token: string; refresh_token: string; expiry_date: number }> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('therapists')
    .select('google_calendar_tokens')
    .eq('id', therapistId)
    .single();
  if (error || !data?.google_calendar_tokens) {
    throw new Error('No Google Calendar tokens found — please reconnect');
  }
  return deserializeTokens(data.google_calendar_tokens);
}

export async function deleteTokensFromVault(therapistId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from('therapists')
    .update({ google_calendar_tokens: null, google_calendar_vault_secret_id: null })
    .eq('id', therapistId);
}

// ── Calendar client ────────────────────────────────────────────────────────

export function getCalendarClient(tokens: {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}) {
  const client = createOAuth2Client();
  client.setCredentials(tokens);
  return google.calendar({ version: 'v3', auth: client });
}

export async function refreshTokenIfNeeded(tokens: {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}): Promise<typeof tokens> {
  // Refresh if token expires within the next minute
  if (tokens.expiry_date > Date.now() + 60_000) return tokens;

  const client = createOAuth2Client();
  client.setCredentials(tokens);
  const { credentials } = await client.refreshAccessToken();
  return {
    access_token: credentials.access_token!,
    refresh_token: credentials.refresh_token || tokens.refresh_token,
    expiry_date: credentials.expiry_date!,
  };
}

// ── High-level helpers used by API routes ──────────────────────────────────

// Lists the calendars on the connected Google account, so the doctor can pick
// a dedicated clinic/work calendar to sync from instead of always pulling
// everything off "primary" (personal engagements included). Uses the same
// calendar.readonly scope already granted — no re-consent needed.
export async function listCalendars(
  tokens: { access_token: string; refresh_token: string; expiry_date: number },
) {
  const refreshedTokens = await refreshTokenIfNeeded(tokens);
  const calendar = getCalendarClient(refreshedTokens);
  const response = await calendar.calendarList.list({ minAccessRole: 'reader' });
  const calendars = (response.data.items || []).map(c => ({
    id: c.id!,
    summary: c.summary || c.id!,
    primary: !!c.primary,
  }));
  return { calendars, refreshedTokens };
}

export async function syncCalendarAppointments(
  tokens: { access_token: string; refresh_token: string; expiry_date: number },
  calendarId: string = 'primary'
) {
  const refreshedTokens = await refreshTokenIfNeeded(tokens);
  const calendar = getCalendarClient(refreshedTokens);

  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 86_400_000);

  const response = await calendar.events.list({
    calendarId,
    timeMin: now.toISOString(),
    timeMax: twoWeeksLater.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  });

  return { events: response.data.items || [], refreshedTokens };
}


export async function createCalendarEvent(
  tokens: { access_token: string; refresh_token: string; expiry_date: number },
  event: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    attendees?: { email: string }[];
  },
  calendarId: string = 'primary'
) {
  const refreshedTokens = await refreshTokenIfNeeded(tokens);
  const calendar = getCalendarClient(refreshedTokens);

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start, timeZone: 'Asia/Kolkata' },
      end: { dateTime: event.end, timeZone: 'Asia/Kolkata' },
      attendees: event.attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'email', minutes: 1440 },
        ],
      },
    },
  });

  return { event: response.data, refreshedTokens };
}

// Creates a calendar event WITH a Google Meet link (conferenceData). Used when a
// doctor books an online session on Kith — they never make or paste a link.
// For a recurring booking, pass an RRULE so a single event (and one reusable Meet
// link) covers the whole series. Returns the Meet URL + created event id.
export async function createMeetEvent(
  tokens: GoogleTokens,
  opts: {
    summary: string;
    description?: string;
    startISO: string;
    durationMin: number;
    attendees?: { email: string }[];
    recurrenceRule?: string | null;   // e.g. 'RRULE:FREQ=WEEKLY;COUNT=6'
  },
  calendarId = 'primary',
): Promise<{ meetingUrl: string; eventId: string }> {
  const refreshed = await refreshTokenIfNeeded(tokens);
  const calendar = getCalendarClient(refreshed);

  const start = new Date(opts.startISO);
  const end = new Date(start.getTime() + opts.durationMin * 60_000);
  const requestId = `kith-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const res = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    sendUpdates: opts.attendees?.length ? 'all' : 'none',
    requestBody: {
      summary: opts.summary,
      description: opts.description,
      start: { dateTime: start.toISOString(), timeZone: 'Asia/Kolkata' },
      end: { dateTime: end.toISOString(), timeZone: 'Asia/Kolkata' },
      attendees: opts.attendees,
      ...(opts.recurrenceRule ? { recurrence: [opts.recurrenceRule] } : {}),
      conferenceData: {
        createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } },
      },
      reminders: { useDefault: true },
    },
  });

  const readUrl = (e: typeof res.data): string | null =>
    e.hangoutLink
    || e.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri
    || null;

  let data = res.data;
  let meetingUrl = readUrl(data);
  // Meet provisioning is occasionally async — re-fetch a few times until ready.
  for (let i = 0; i < 4 && !meetingUrl && data.id; i++) {
    await new Promise(r => setTimeout(r, 700));
    const g = await calendar.events.get({ calendarId, eventId: data.id });
    data = g.data;
    meetingUrl = readUrl(data);
  }

  if (!meetingUrl || !data.id) throw new Error('Google did not return a Meet link');
  // Bake the ORGANIZER's account into the link (authuser) so the doctor joins as
  // the real host — no lobby. organizer.email is the connected Google account that
  // owns the event, which is the only account Google treats as host. The bot and
  // the copy/share link strip this back off (cleanMeetUrl) so they stay generic.
  const organizerEmail = data.organizer?.email;
  const hostUrl = organizerEmail
    ? `${meetingUrl}?authuser=${encodeURIComponent(organizerEmail)}`
    : meetingUrl;
  return { meetingUrl: hostUrl, eventId: data.id };
}

// Strip the host hint (authuser) so the bot and patient get a plain Meet link.
export function cleanMeetUrl(url: string): string {
  return url.split('?')[0];
}

// Best-effort delete of a calendar event (used when an online appointment is
// cancelled and no other appointment still references the event).
export async function deleteCalendarEvent(
  tokens: GoogleTokens,
  eventId: string,
  calendarId = 'primary',
): Promise<void> {
  const refreshed = await refreshTokenIfNeeded(tokens);
  const calendar = getCalendarClient(refreshed);
  await calendar.events.delete({ calendarId, eventId, sendUpdates: 'all' });
}

export async function updateCalendarEvent(
  tokens: { access_token: string; refresh_token: string; expiry_date: number },
  eventId: string,
  updates: { start?: string; end?: string; summary?: string },
  calendarId: string = 'primary'
) {
  const refreshedTokens = await refreshTokenIfNeeded(tokens);
  const calendar = getCalendarClient(refreshedTokens);

  const requestBody: Record<string, unknown> = {};
  if (updates.summary) requestBody.summary = updates.summary;
  if (updates.start) requestBody.start = { dateTime: updates.start, timeZone: 'Asia/Kolkata' };
  if (updates.end) requestBody.end = { dateTime: updates.end, timeZone: 'Asia/Kolkata' };

  const response = await calendar.events.patch({ calendarId, eventId, requestBody });
  return { event: response.data, refreshedTokens };
}
