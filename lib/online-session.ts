/**
 * lib/online-session.ts
 *
 * Finalises an online (bot-recorded) session: pull the transcript from Recall,
 * save it, mark the session "processing", and fire the SAME background
 * note-generation pipeline used for in-person sessions (/api/sessions/process-notes).
 *
 * Called by the Recall webhook on `bot.done`. In mock mode it's also called
 * directly from /api/sessions/bot so the flow completes locally without a real call.
 */

import { waitUntil } from '@vercel/functions';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getRecallTranscript } from '@/lib/recall';
import { runNoteGeneration } from '@/lib/process-notes';
import type { TranscriptSegment } from '@/types';

export async function finalizeOnlineSession(sessionId: string, botId: string | null): Promise<void> {
  const service = createServiceRoleClient();

  const { data: session } = await service
    .from('sessions')
    .select('id, status, patient_id, appointment_id, transcript_raw')
    .eq('id', sessionId)
    .single();

  if (!session) return;
  // Terminal — nothing more to do.
  if (session.status === 'completed' || session.status === 'failed') return;
  // Already finalised with a transcript (notes generating) — don't re-run.
  const existingLen = Array.isArray(session.transcript_raw) ? session.transcript_raw.length : 0;
  if (session.status === 'processing' && existingLen > 0) return;

  const { segments: transcript, hadRecording } = botId
    ? await getRecallTranscript(botId)
    : { segments: [], hadRecording: false };
  const now = new Date().toISOString();

  if (transcript.length === 0) {
    // No recording ever happened — most often the bot sat in the meeting
    // platform's waiting room and nobody admitted it. This is permanent: no
    // later webhook will ever bring a transcript, so fail now instead of
    // leaving the doctor staring at "Generating notes..." forever.
    if (!hadRecording) {
      await service.from('sessions').update({ status: 'failed', ended_at: now }).eq('id', sessionId);
      if (session.appointment_id) {
        await service.from('appointments').update({ status: 'completed' }).eq('id', session.appointment_id);
      }
      console.warn(`[Kith] online session ${sessionId} had no recording — was "Kith Notetaker" admitted to the call?`);
      return;
    }
    // Recording exists but the transcript file isn't ready yet (e.g.
    // force-stop before Recall finished processing, or a bot.done before
    // transcript.done). Mark "processing" so the UI isn't stuck "in
    // session", and WAIT for the later transcript.done event.
    await service.from('sessions').update({ status: 'processing', ended_at: now }).eq('id', sessionId);
    if (session.appointment_id) {
      await service.from('appointments').update({ status: 'completed' }).eq('id', session.appointment_id);
    }
    return;
  }

  await service.from('sessions').update({
    status: 'processing',
    ended_at: now,
    transcript_raw: transcript,
  }).eq('id', sessionId);

  if (session.appointment_id) {
    await service.from('appointments').update({ status: 'completed' }).eq('id', session.appointment_id);
  }
  await service.from('patients')
    .update({ last_session_date: now.split('T')[0] })
    .eq('id', session.patient_id);

  // Run the existing note pipeline (same as /api/sessions/end) in the
  // background. waitUntil() keeps the webhook invocation alive until this
  // settles — previously this was a fire-and-forget fetch() to a separate
  // route, which Vercel could silently drop the moment the webhook handler's
  // response was sent, leaving the session stuck at "processing" forever.
  waitUntil(
    runNoteGeneration(sessionId).catch(err => {
      console.error('[Kith] online process-notes (waitUntil) failed:', err);
    }),
  );
}

// Appends one realtime utterance (Ultra-only `transcript.data` webhook events,
// see app/api/webhooks/recall/route.ts) to the session's transcript while the
// call is still in progress. Purely for the live suggestions/homework preview
// — finalizeOnlineSession() overwrites transcript_raw with Recall's authoritative
// post-call file once the bot leaves, so a missed or duplicated live segment
// here has no effect on the actual clinical notes.
export async function appendLiveTranscriptSegment(sessionId: string, segment: TranscriptSegment): Promise<void> {
  const service = createServiceRoleClient();

  const { data: session } = await service
    .from('sessions')
    .select('status, transcript_raw')
    .eq('id', sessionId)
    .single();

  // Session already finalised (or gone) — nothing to append to.
  if (!session || session.status === 'completed' || session.status === 'failed') return;

  const existing = Array.isArray(session.transcript_raw) ? session.transcript_raw : [];
  await service.from('sessions')
    .update({ transcript_raw: [...existing, segment] })
    .eq('id', sessionId);
}

export async function failOnlineSession(sessionId: string, reason: string): Promise<void> {
  const service = createServiceRoleClient();
  await service.from('sessions')
    .update({ status: 'failed' })
    .eq('id', sessionId)
    .eq('status', 'active');
  console.warn(`[Kith] online session ${sessionId} failed: ${reason}`);
}
