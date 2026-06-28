/**
 * POST /api/billing/subscribe
 *
 * Creates a Razorpay Subscription (real recurring billing — auto-charges via
 * UPI Autopay / card e-mandate) for the doctor's chosen tier + interval. The
 * Plan must already exist in Razorpay (see /api/billing/admin/setup-plans,
 * a one-time operator step run after real keys are configured).
 *
 * Body: { tier: 'starter' | 'pro', interval: 'monthly' | 'annual' }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getRazorpayClient, razorpayConfigured, getPlanId, type PaidTier, type BillingInterval } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!razorpayConfigured()) {
    return NextResponse.json({ error: 'Billing isn’t set up yet — contact support.' }, { status: 503 });
  }

  const { tier, interval } = await req.json().catch(() => ({}));
  if (tier !== 'starter' && tier !== 'pro') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 422 });
  }
  if (interval !== 'monthly' && interval !== 'annual') {
    return NextResponse.json({ error: 'Invalid billing interval' }, { status: 422 });
  }

  const planId = getPlanId(tier as PaidTier, interval as BillingInterval);
  if (!planId) {
    return NextResponse.json(
      { error: `Plan not configured (${tier}/${interval}) — run the one-time Razorpay plan setup first.` },
      { status: 503 },
    );
  }

  const { data: therapist } = await supabase
    .from('therapists').select('id, display_name, email, phone').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

  const razorpay = getRazorpayClient();
  // total_count = number of billing cycles Razorpay will charge before the
  // subscription naturally expires. We pick a long horizon (10 years) so it
  // effectively runs "until cancelled" without needing to renew the mandate.
  const totalCount = interval === 'monthly' ? 120 : 10;

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: totalCount,
    customer_notify: 1,
    notes: { user_id: user.id, tier, interval },
  });

  return NextResponse.json({
    subscription_id: subscription.id,
    key: process.env.RAZORPAY_KEY_ID,
    tier,
    interval,
    prefill: { name: therapist.display_name, email: therapist.email, contact: therapist.phone },
  });
}
