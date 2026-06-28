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

export type PaidTier = 'starter' | 'pro';
export type BillingInterval = 'monthly' | 'annual';

// ₹ amounts in paise. Annual = 10× monthly (2 months free) — a standard,
// low-effort lever that improves cash flow and cuts churn.
export const PLAN_PRICING: Record<PaidTier, { monthly: number; annual: number }> = {
  starter: { monthly: 99900, annual: 999000 },   // ₹999/mo · ₹9,990/yr
  pro:     { monthly: 249900, annual: 2499000 }, // ₹2,499/mo · ₹24,990/yr
};

// Free-tier session cap, used as the universal fallback (expired trial,
// cancelled subscription, failed payment) instead of a hard lockout.
export const FREE_SESSION_CAP = 5;

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
