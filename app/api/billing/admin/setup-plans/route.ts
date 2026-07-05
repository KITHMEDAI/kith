/**
 * POST /api/billing/admin/setup-plans
 *
 * ONE-TIME operator action — run this once after adding real Razorpay keys to
 * production. Creates the 4 recurring Plans (starter/pro × monthly/annual) via
 * Razorpay's API, so nobody has to click through the Razorpay dashboard by
 * hand. Returns the created Plan IDs and the exact env var names to paste them
 * into (Vercel → Settings → Environment Variables) — without those env vars,
 * /api/billing/subscribe has nothing to charge against.
 *
 * Protected by INTERNAL_API_SECRET (same header convention as the notes
 * pipeline's internal routes) — this is operator-only, never called by the UI.
 * Safe to re-run: Razorpay has no idempotency key for Plans, so re-running
 * creates NEW duplicate plans — only run this once per environment.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getRazorpayClient, razorpayConfigured, PLAN_PRICING, planEnvVarName, type PaidTier, type BillingInterval } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  const expected = process.env.INTERNAL_API_SECRET;
  // Fail closed if the secret isn't configured — no hardcoded fallback that
  // would otherwise become a guessable shared backdoor.
  if (!expected || secret !== expected) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!razorpayConfigured()) {
    return NextResponse.json({ error: 'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set yet' }, { status: 503 });
  }

  const razorpay = getRazorpayClient();
  const combos: Array<{ tier: PaidTier; interval: BillingInterval }> = [
    { tier: 'pro', interval: 'monthly' },
    { tier: 'pro', interval: 'annual' },
    { tier: 'ultra', interval: 'monthly' },
    { tier: 'ultra', interval: 'annual' },
  ];

  const results: Record<string, { plan_id: string; env_var: string }> = {};
  const errors: string[] = [];

  for (const { tier, interval } of combos) {
    try {
      const amount = PLAN_PRICING[tier][interval];
      const plan = await razorpay.plans.create({
        period: interval === 'monthly' ? 'monthly' : 'yearly',
        interval: 1,
        item: {
          name: `Kith ${tier === 'ultra' ? 'Ultra' : 'Pro'} (${interval})`,
          amount,
          currency: 'INR',
          description: `Kith clinical workspace — ${tier} plan, billed ${interval}`,
        },
        notes: { tier, interval },
      });
      results[`${tier}_${interval}`] = { plan_id: plan.id, env_var: planEnvVarName(tier, interval) };
    } catch (e) {
      errors.push(`${tier}/${interval}: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }

  return NextResponse.json({
    created: results,
    errors,
    next_step: 'Copy each plan_id into its env_var in Vercel → Settings → Environment Variables, then redeploy.',
  });
}
