/**
 * lib/entitlements.ts
 *
 * Single source of truth for "what does this plan actually unlock". Every
 * server route that gates a feature, and every UI surface that displays plan
 * benefits, reads from here — so the billing page's feature list, the
 * booking dialog's lock icon, and the actual 402 a doctor hits on the API
 * can never drift out of sync with each other.
 *
 * Deliberately has NO dependency on lib/razorpay.ts (which pulls in the
 * server-only Razorpay SDK) — this module is imported by client components
 * (billing page, booking dialog) and must stay lightweight, or the whole
 * Razorpay SDK ends up bundled into the browser.
 */

export type PlanKey = 'free' | 'starter' | 'pro' | 'clinic';

// Free-tier session cap, used as the universal fallback (expired trial,
// cancelled subscription, failed payment) instead of a hard lockout.
export const FREE_SESSION_CAP = 5;

export interface Entitlements {
  plan: PlanKey;              // EFFECTIVE plan for this request (accounts for an active trial)
  storedPlan: PlanKey;        // the plan they're actually paying for (or 'free')
  sessionCap: number;         // -1 = unlimited
  onlineSessions: boolean;    // video modality + automatic notetaker bot
  calendarSync: boolean;      // Google Calendar connect + auto Meet creation
  patientMessaging: boolean;  // WhatsApp / SMS to patients
  isTrialing: boolean;
  trialDaysLeft: number | null;
}

interface BillingFields {
  subscription_plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
}

const SESSION_CAPS: Record<PlanKey, number> = {
  free: FREE_SESSION_CAP,
  starter: 30,
  pro: -1,
  clinic: -1,
};

export function getEntitlements(t: BillingFields): Entitlements {
  const trialEndsAt = t.trial_ends_at ? new Date(t.trial_ends_at) : null;
  const isTrialing = t.subscription_status === 'trialing' && !!trialEndsAt && trialEndsAt >= new Date();
  const paidActive = t.subscription_status === 'active';
  const storedPlan = (t.subscription_plan as PlanKey) || 'free';

  // An active trial tastes the full Pro experience; otherwise you get exactly
  // what you're paying for, and anything else (expired trial, cancelled,
  // past_due, no subscription at all) falls back to Free — never a lockout.
  const plan: PlanKey = isTrialing ? 'pro' : paidActive ? storedPlan : 'free';

  return {
    plan,
    storedPlan,
    sessionCap: SESSION_CAPS[plan] ?? FREE_SESSION_CAP,
    onlineSessions: plan !== 'free',
    calendarSync: plan !== 'free',
    patientMessaging: plan === 'pro' || plan === 'clinic',
    isTrialing,
    trialDaysLeft: trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)) : null,
  };
}

// Plain-English feature copy, shared by the billing page and every upgrade
// prompt so the wording a doctor sees when blocked always matches what the
// plan card promised.
export const PLAN_FEATURES: Record<PlanKey, string[]> = {
  free: ['5 sessions/month', 'AI-assisted SOAP notes', 'In-person recording', 'Patient & booking management'],
  starter: ['30 sessions/month', 'Everything in Free', 'Online sessions (auto notetaker bot)', 'Google Calendar sync + auto-created Meet links'],
  pro: ['Unlimited sessions', 'Everything in Starter', 'WhatsApp & SMS to patients', 'Priority support'],
  clinic: ['Everything in Pro', 'Multiple therapist seats', 'Admin dashboard', 'White-label option'],
};

export function upgradeMessage(feature: 'online sessions' | 'Google Calendar sync' | 'patient messaging'): string {
  return `Upgrade to Starter or Pro to unlock ${feature}.`;
}
