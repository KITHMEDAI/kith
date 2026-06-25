import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Razorpay from 'razorpay';

const PLAN_AMOUNTS: Record<string, number> = {
  starter: 99900,  // ₹999 in paise
  pro: 249900,     // ₹2,499
  clinic: 599900,  // ₹5,999
};

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan } = await req.json().catch(() => ({}));
  if (!PLAN_AMOUNTS[plan]) return NextResponse.json({ error: 'Invalid plan' }, { status: 422 });

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: 'Razorpay not configured' }, { status: 503 });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const order = await razorpay.orders.create({
    amount: PLAN_AMOUNTS[plan],
    currency: 'INR',
    notes: { user_id: user.id, plan },
  });

  return NextResponse.json({
    order_id: order.id,
    key: process.env.RAZORPAY_KEY_ID,
    amount: PLAN_AMOUNTS[plan],
    currency: 'INR',
  });
}
