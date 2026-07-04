/**
 * POST /api/webhooks/razorpay
 *
 * Handles Razorpay Subscription lifecycle events. This is the source of
 * truth for billing state — /api/billing/verify updates optimistically right
 * after checkout, but the webhook is what keeps us correct for renewals,
 * failed payments, and cancellations that happen with no user in the app.
 *
 * Philosophy: a doctor never gets hard-locked out for a billing problem —
 * `past_due`/`cancelled` just fall back to Free-tier session caps
 * (lib/razorpay.ts + /api/sessions/start), never a blocked account.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  const expectedSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  const givenBuf = Buffer.from(signature, 'hex');
  const signatureValid =
    !!secret && expectedBuf.length === givenBuf.length && crypto.timingSafeEqual(expectedBuf, givenBuf);
  if (!signatureValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const supabase = createServiceRoleClient();

  const sub = event.payload?.subscription?.entity;
  const notes = sub?.notes || event.payload?.payment?.entity?.notes || {};
  const userId = notes.user_id as string | undefined;
  if (!userId) return NextResponse.json({ received: true, ignored: 'no user_id in notes' });

  const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', userId).single();
  if (!therapist) return NextResponse.json({ received: true, ignored: 'no matching therapist' });

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged':
      // New activation or a successful renewal charge — confirm/keep active.
      await supabase.from('therapists').update({
        subscription_status: 'active',
        ...(notes.tier ? { subscription_plan: notes.tier } : {}),
        ...(notes.interval ? { billing_interval: notes.interval } : {}),
        ...(sub?.id ? { razorpay_subscription_id: sub.id } : {}),
      }).eq('id', therapist.id);
      break;

    case 'subscription.pending':
    case 'subscription.halted':
      // Payment retries failing — flag it, but DON'T block the doctor; the
      // session-start gate already treats past_due as Free-tier-capped.
      await supabase.from('therapists').update({ subscription_status: 'past_due' }).eq('id', therapist.id);
      break;

    case 'subscription.cancelled':
    case 'subscription.completed':
    case 'subscription.expired':
      await supabase.from('therapists').update({ subscription_status: 'cancelled' }).eq('id', therapist.id);
      break;

    default:
      break; // other lifecycle events (created, authenticated, paused, resumed) — no-op
  }

  return NextResponse.json({ received: true });
}
