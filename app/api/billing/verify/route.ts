/**
 * POST /api/billing/verify
 *
 * Confirms the authorisation payment Razorpay Checkout just collected for a
 * new Subscription. Subscriptions use a DIFFERENT signature formula than
 * one-time orders: hmac(payment_id + '|' + subscription_id), not
 * hmac(order_id + '|' + payment_id).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getRazorpayClient, razorpayConfigured, type PaidTier, type BillingInterval } from '@/lib/razorpay';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!razorpayConfigured()) {
    return NextResponse.json({ error: 'Billing isn’t set up yet — contact support.' }, { status: 503 });
  }

  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = await req.json().catch(() => ({}));
  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 422 });
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const givenBuf = Buffer.from(String(razorpay_signature), 'hex');
  const signatureValid =
    expectedBuf.length === givenBuf.length && crypto.timingSafeEqual(expectedBuf, givenBuf);
  if (!signatureValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Don't trust tier/interval from the client — a signed payment_id/subscription_id
  // pair only proves *a* payment happened, not which plan it was for. Fetch the
  // subscription from Razorpay and read the tier/interval from its `notes`, which
  // were set server-side in /api/billing/subscribe and can't be tampered with.
  const subscription = await getRazorpayClient().subscriptions.fetch(razorpay_subscription_id);
  const notes = (subscription.notes || {}) as Record<string, string>;
  const tier = notes.tier as PaidTier | undefined;
  const interval = notes.interval as BillingInterval | undefined;
  if (notes.user_id !== user.id || (tier !== 'pro' && tier !== 'ultra') || (interval !== 'monthly' && interval !== 'annual')) {
    return NextResponse.json({ error: 'Subscription does not match this account' }, { status: 400 });
  }

  const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

  // Service-role write: a BEFORE UPDATE trigger (008_protect_billing_columns.sql)
  // reverts billing columns on any update that isn't made as service_role, to
  // stop a doctor from setting their own subscription_plan via the client SDK.
  await createServiceRoleClient()
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
