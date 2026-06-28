/**
 * POST /api/billing/verify
 *
 * Confirms the authorisation payment Razorpay Checkout just collected for a
 * new Subscription. Subscriptions use a DIFFERENT signature formula than
 * one-time orders: hmac(payment_id + '|' + subscription_id), not
 * hmac(order_id + '|' + payment_id).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, tier, interval } = await req.json().catch(() => ({}));
  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !tier || !interval) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 422 });
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

  await supabase
    .from('therapists')
    .update({
      subscription_plan: tier,
      subscription_status: 'active',
      billing_interval: interval,
      razorpay_subscription_id,
    })
    .eq('id', therapist.id);

  return NextResponse.json({ ok: true });
}
