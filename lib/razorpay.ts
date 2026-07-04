/**
 * lib/razorpay.ts
 *
 * Recurring billing via Razorpay Subscriptions (NOT one-time orders — a real
 * SaaS plan needs auto-renewal via UPI Autopay / card e-mandate, otherwise the
 * doctor would have to manually re-pay every month).
 *
 * Plan IDs are created ONCE (via /api/billing/admin/setup-plans, after real
 * Razorpay keys are configured) and then read from env vars — Razorpay has no
 * "get or create by reference" call, so re-creating on every request would
 * just spam duplicate plans.
 */
import Razorpay from 'razorpay';

export type PaidTier = 'pro' | 'ultra';
export type BillingInterval = 'monthly' | 'annual';

// Priced/marketed in USD ($20/mo Pro, $50/mo Ultra) but CHARGED in INR — this
// account settles INR only (no Razorpay international-payments approval yet).
// INR amounts below are the ~USD equivalent at ₹85/$, rounded to charm
// pricing. Annual = 10× monthly (2 months free), matching the marketed price.
// ₹ amounts in paise.
export const PLAN_PRICING: Record<PaidTier, { monthly: number; annual: number }> = {
  pro:   { monthly: 169900, annual: 1699000 },  // ₹1,699/mo · ₹16,990/yr (~$20/mo · $200/yr)
  ultra: { monthly: 424900, annual: 4249000 },  // ₹4,249/mo · ₹42,490/yr (~$50/mo · $500/yr)
};

export function razorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayClient(): Razorpay {
  if (!razorpayConfigured()) throw new Error('Razorpay not configured');
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

// Env var name for a given tier+interval's Razorpay Plan ID, e.g.
// RAZORPAY_PLAN_PRO_ANNUAL. Created once via the admin setup route.
export function planEnvVarName(tier: PaidTier, interval: BillingInterval): string {
  return `RAZORPAY_PLAN_${tier.toUpperCase()}_${interval.toUpperCase()}`;
}

export function getPlanId(tier: PaidTier, interval: BillingInterval): string | null {
  return process.env[planEnvVarName(tier, interval)] || null;
}
