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

  // Immediately setting subscription_status='cancelled' here used to downgrade
  // the doctor to Free the instant they clicked Cancel — contradicting both
  // this comment and the confirm-dialog copy, which promise access until the
  // cycle actually ends. subscription_status now stays 'active' through the
  // paid-through period; cancel_at (checked by getEntitlements()) is what
  // actually lapses access, at the real cycle-end date.
  let cancelAt: string | null = null;

  if (therapist.razorpay_subscription_id && razorpayConfigured()) {
    try {
      const sub = await getRazorpayClient().subscriptions.cancel(therapist.razorpay_subscription_id, true); // true = at cycle end
      if (sub.current_end) cancelAt = new Date(sub.current_end * 1000).toISOString(); // current_end is Unix seconds
    } catch {
      // Already cancelled on Razorpay's side, or similar — proceed regardless.
    }
  }

  // Fallback if we couldn't get a real cycle-end date (Razorpay not
  // configured, or the cancel call didn't return one) — without a known
  // paid-through date there's no cycle to honor, so cancel immediately
  // rather than grant an undefined amount of free extra access.
  const updates = cancelAt
    ? { cancel_at: cancelAt }
    : { subscription_status: 'cancelled', cancel_at: null };

  // Service-role write — see 008_protect_billing_columns.sql.
  await createServiceRoleClient().from('therapists').update(updates).eq('id', therapist.id);
  return NextResponse.json({ ok: true, cancel_at: cancelAt });
}
