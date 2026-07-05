/**
 * POST /api/sessions/bot
 *
 * Starts an ONLINE session: dispatches a Recall.ai bot to the appointment's
 * meeting link (Teams / Meet) to record it. The doctor keeps using their normal
 * call — nothing changes for them. When the bot finishes, the Recall webhook
 * (/api/webhooks/recall) pulls the transcript and generates notes.
 *
 * Body: { appointmentId }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createRecallBot, RECALL_MOCK } from '@/lib/recall';
import { cleanMeetUrl } from '@/lib/google-calendar';
import { finalizeOnlineSession } from '@/lib/online-session';
import { getEntitlements, upgradeMessage } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists').select('id, subscription_plan, subscription_status, trial_ends_at').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'No therapist profile found' }, { status: 404 });

  const entitlements = getEntitlements(therapist);
  if (!entitlements.onlineSessions) {
    return NextResponse.json({ error: upgradeMessage('online sessions'), code: 'PLAN_LOCKED' }, { status: 402 });
  }

  // Same monthly session cap as /api/sessions/start — online (bot) sessions
  // must count against it too, or a Pro-tier user could get effectively
  // unlimited sessions by always booking video instead of in-person.
  if (entitlements.sessionCap !== -1) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('therapist_id', therapist.id)
      .gte('started_at', startOfMonth.toISOString());
    if ((count ?? 0) >= entitlements.sessionCap) {
      return NextResponse.json(
        { error: `Monthly session limit reached (${entitlements.sessionCap} sessions on your ${entitlements.plan} plan). Upgrade for unlimited sessions.`, code: 'PLAN_LOCKED' },
        { status: 402 },
      );
    }
  }

  const { appointmentId } = await req.json().catch(() => ({}));
  if (!appointmentId) return NextResponse.json({ error: 'appointmentId required' }, { status: 422 });

  const service = createServiceRoleClient();

  // Load the appointment + verify ownership.
  const { data: appt } = await service
    .from('appointments')
    .select('id, therapist_id, patient_id, meeting_url')
    .eq('id', appointmentId)
    .single();

  if (!appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  if (appt.therapist_id !== therapist.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!appt.meeting_url) {
    return NextResponse.json(
      { error: 'No meeting link on this appointment. Re-sync Google Calendar so Kith can find the Meet/Teams link.' },
      { status: 400 },
    );
  }

  // Soft consent check (mirrors /api/sessions/start — warn, don't block).
  if (appt.patient_id) {
    const { data: patient } = await service
      .from('patients').select('consent_recording').eq('id', appt.patient_id).single();
    if (!patient?.consent_recording) {
      console.warn(`[Kith] Online session started without recorded consent for patient ${appt.patient_id}.`);
    }
  }

  // Create the session row up front so we can correlate the bot back to it.
  const { data: session, error: sessionErr } = await service
    .from('sessions')
    .insert({
      therapist_id: therapist.id,
      patient_id: appt.patient_id,
      appointment_id: appt.id,
      recording_source: 'online_bot',
      status: 'active',
    })
    .select()
    .single();
  if (sessionErr || !session) {
    return NextResponse.json({ error: sessionErr?.message || 'Failed to create session' }, { status: 500 });
  }

  // Dispatch the bot.
  let botId: string;
  try {
    const bot = await createRecallBot({
      meetingUrl: cleanMeetUrl(appt.meeting_url),   // bot needs the plain link, no authuser
      metadata: { session_id: session.id },
    });
    botId = bot.id;
  } catch (err) {
    await service.from('sessions').update({ status: 'failed' }).eq('id', session.id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to dispatch notetaker bot' },
      { status: 502 },
    );
  }

  await service.from('sessions').update({ recall_bot_id: botId }).eq('id', session.id);
  await service.from('appointments')
    .update({ status: 'in_session', session_id: session.id })
    .eq('id', appt.id);

  // In mock mode there's no real call/webhook — simulate completion so the
  // full flow (transcript → notes) is testable locally.
  if (RECALL_MOCK) {
    finalizeOnlineSession(session.id, botId).catch(err =>
      console.error('[Kith] mock online finalize failed:', err));
  }

  return NextResponse.json({ session: { ...session, recall_bot_id: botId }, mock: RECALL_MOCK });
}
