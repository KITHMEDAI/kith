import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (expectedSig !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const supabase = createServiceRoleClient();

  if (event.event === 'subscription.activated' || event.event === 'payment.captured') {
    const notes = event.payload?.payment?.entity?.notes || {};
    const userId = notes.user_id;
    const plan = notes.plan;

    if (userId && plan) {
      const { data: therapist } = await supabase
        .from('therapists')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (therapist) {
        await supabase
          .from('therapists')
          .update({ subscription_plan: plan, subscription_status: 'active' })
          .eq('id', therapist.id);
      }
    }
  }

  if (event.event === 'subscription.cancelled' || event.event === 'subscription.halted') {
    const notes = event.payload?.subscription?.entity?.notes || {};
    const userId = notes.user_id;
    if (userId) {
      const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', userId).single();
      if (therapist) {
        await supabase
          .from('therapists')
          .update({ subscription_status: event.event === 'subscription.cancelled' ? 'cancelled' : 'past_due' })
          .eq('id', therapist.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
