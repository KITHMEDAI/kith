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

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getRecallTranscript } from '@/lib/recall';

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

  const transcript = botId ? await getRecallTranscript(botId) : [];
  const now = new Date().toISOString();

  // No transcript yet (e.g. force-stop before Recall finished processing, or a
  // bot.done before transcript.done). Mark the session "processing" so the UI
  // isn't stuck "in session", but WAIT for a later event that carries the
  // transcript before generating notes — avoids empty/duplicate note runs.
  if (transcript.length === 0) {
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

  // Fire-and-forget the existing note pipeline (same as /api/sessions/end).
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
  const internalSecret = process.env.INTERNAL_API_SECRET || 'kith-internal-dev';
  fetch(`${baseUrl}/api/sessions/process-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
    body: JSON.stringify({ sessionId }),
  }).catch(err => console.error('[Kith] online process-notes trigger failed:', err));
}

export async function failOnlineSession(sessionId: string, reason: string): Promise<void> {
  const service = createServiceRoleClient();
  await service.from('sessions')
    .update({ status: 'failed' })
    .eq('id', sessionId)
    .eq('status', 'active');
  console.warn(`[Kith] online session ${sessionId} failed: ${reason}`);
}
