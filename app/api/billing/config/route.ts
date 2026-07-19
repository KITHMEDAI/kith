/**
 * GET /api/billing/config
 *
 * Lets the billing page know upfront whether Razorpay is actually wired up,
 * instead of showing "Subscribe" buttons that always fail with a 503 once
 * clicked. Returns only a boolean — no keys or secrets.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { razorpayConfigured } from '@/lib/razorpay';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ configured: razorpayConfigured() });
}
