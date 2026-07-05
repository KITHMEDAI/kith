/**
 * POST /api/billing/cancel
 *
 * Cancels the doctor's active Razorpay subscription. Cancellation is
 * scheduled for the END of the current billing cycle (not immediate) — they
 * already paid for it, so they keep full access until it lapses, then fall
 * back to the Free tier. Never a hard, immediate lockout.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getRazorpayClient, razorpayConfigured } from '@/lib/razorpay';

export async function POST() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists').select('id, razorpay_subscription_id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

  if (therapist.razorpay_subscription_id && razorpayConfigured()) {
    try {
      await getRazorpayClient().subscriptions.cancel(therapist.razorpay_subscription_id, true); // true = at cycle end
    } catch {
      // Already cancelled on Razorpay's side, or similar — proceed to update our own record regardless.
    }
  }

  // Service-role write — see 008_protect_billing_columns.sql.
  await createServiceRoleClient().from('therapists').update({ subscription_status: 'cancelled' }).eq('id', therapist.id);
  return NextResponse.json({ ok: true });
}
