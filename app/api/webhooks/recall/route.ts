/**
 * POST /api/webhooks/recall
 *
 * Receives Recall.ai bot lifecycle events (Svix-signed). On `bot.done` it pulls
 * the transcript and runs note generation; on failure events it marks the
 * session failed. Everything else is acknowledged and ignored.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRecallSignature } from '@/lib/recall';
import { finalizeOnlineSession, failOnlineSession } from '@/lib/online-session';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifyRecallSignature(rawBody, (n) => req.headers.get(n))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }

  const event = (body.event as string) || '';
  const data = (body.data as Record<string, unknown>) || {};
  const bot = (data.bot as Record<string, unknown>) || {};
  const botId = (bot.id as string) || (data.bot_id as string) || null;

  // Prefer the session_id we attached as metadata; fall back to bot id lookup.
  const metaSessionId =
    ((bot.metadata as Record<string, string> | undefined)?.session_id) ||
    ((data.metadata as Record<string, string> | undefined)?.session_id) ||
    null;

  // Normalise event name (some payloads carry it as data.status.code).
  const statusCode = (data.status as { code?: string } | undefined)?.code;
  const type = event || (statusCode ? `bot.${statusCode}` : '');

  let sessionId = metaSessionId;
  if (!sessionId && botId) {
    const { data: s } = await createServiceRoleClient()
      .from('sessions').select('id').eq('recall_bot_id', botId).maybeSingle();
    sessionId = s?.id ?? null;
  }

  if (!sessionId) return NextResponse.json({ ok: true, ignored: 'no matching session' });

  try {
    switch (type) {
      // `transcript.done` fires when the transcript is fully ready; `bot.done`
      // fires when the bot leaves. Either can finalise — finalizeOnlineSession is
      // idempotent (only acts on a still-active session), so whichever arrives
      // first with the transcript wins.
      case 'transcript.done':
      case 'bot.done':
        await finalizeOnlineSession(sessionId, botId);
        break;
      case 'bot.fatal':
        await failOnlineSession(sessionId, 'bot fatal error');
        break;
      case 'bot.recording_permission_denied':
        await failOnlineSession(sessionId, 'recording permission denied');
        break;
      default:
        // joining_call / in_call_recording / call_ended etc. — acknowledged, no-op.
        break;
    }
  } catch (err) {
    console.error('[Kith] recall webhook handler error:', err);
    // Still 200 so Recall doesn't hammer retries; we logged it.
  }

  return NextResponse.json({ ok: true });
}
