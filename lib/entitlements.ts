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

export type PlanKey = 'free' | 'pro' | 'ultra' | 'clinic';

// Free-tier session cap, used as the universal fallback (expired trial,
// cancelled subscription, failed payment) instead of a hard lockout.
export const FREE_SESSION_CAP = 5;

export interface Entitlements {
  plan: PlanKey;              // EFFECTIVE plan for this request
  storedPlan: PlanKey;        // the plan they're actually paying for (or 'free')
  sessionCap: number;         // -1 = unlimited
  sessionDurationCapMinutes: number; // hard per-session length limit for this plan
  onlineSessions: boolean;    // video modality + automatic notetaker bot
  calendarSync: boolean;      // Google Calendar connect + auto Meet creation
  patientMessaging: boolean;  // WhatsApp / SMS to patients
  groupSessionTypes: boolean; // couples / family / group session types (Free = individual only)
  liveOnlineUpdates: boolean; // real-time transcript streaming for online (bot) sessions — Ultra+ only, costs extra per Recall session
}

interface BillingFields {
  subscription_plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
}

// Session-count caps are sized around real per-session cost (Deepgram/Recall
// transcription + Claude note-gen runs ~$0.40-0.50 per 50-min session) so each
// tier keeps a heavy margin even at typical usage, not just on paper:
//  - Free: loss-leader, capped hard (~$2.50/mo max cost) to bound CAC.
//  - Pro: 60/mo covers a genuinely busy solo practice (~3/weekday) with room
//    to spare — most paying users won't get near it.
//  - Ultra: uncapped session count (true "unlimited" is credible for a human
//    running real 1:1 sessions — throughput is bounded by their own calendar),
//    but per-session duration is still capped as an anti-abuse ceiling.
const SESSION_CAPS: Record<PlanKey, number> = {
  free: FREE_SESSION_CAP,
  pro: 60,
  ultra: -1,
  clinic: -1,
};

// Per-session hard duration limit (minutes) — enforced client-side by
// auto-ending the recording when reached. Free's 50-min cap matches a
// standard therapy hour; paid tiers get room for intakes/extended sessions
// without leaving duration completely unbounded.
export const SESSION_DURATION_CAPS: Record<PlanKey, number> = {
  free: 50,
  pro: 90,
  ultra: 120,
  clinic: 120,
};

export function getEntitlements(t: BillingFields): Entitlements {
  const paidActive = t.subscription_status === 'active';
  const storedPlan = (t.subscription_plan as PlanKey) || 'free';

  // No taste-of-Ultra trial — you get exactly what you're paying for, and
  // anything else (no subscription, cancelled, past_due) falls back to Free,
  // never a lockout.
  const plan: PlanKey = paidActive ? storedPlan : 'free';

  return {
    plan,
    storedPlan,
    sessionCap: SESSION_CAPS[plan] ?? FREE_SESSION_CAP,
    sessionDurationCapMinutes: SESSION_DURATION_CAPS[plan] ?? SESSION_DURATION_CAPS.free,
    onlineSessions: plan !== 'free',
    calendarSync: plan !== 'free',
    patientMessaging: plan === 'ultra' || plan === 'clinic',
    groupSessionTypes: plan !== 'free',
    liveOnlineUpdates: plan === 'ultra' || plan === 'clinic',
  };
}

// Plain-English feature copy, shared by the billing page and every upgrade
// prompt so the wording a doctor sees when blocked always matches what the
// plan card promised.
export const PLAN_FEATURES: Record<PlanKey, string[]> = {
  free: [
    '5 sessions a month, 50 minutes each',
    'AI-written clinical notes after every session',
    'In-person session recording',
    'Manage patients & appointments in one place',
  ],
  pro: [
    '60 sessions a month, 90 minutes each',
    'Online sessions available — Kith joins the call and records it for you',
    'Clinical notes ready once the session ends',
    'Your calendar synced automatically, with a meeting link created for every session',
  ],
  ultra: [
    'Unlimited sessions, 120 minutes each',
    'Online sessions with live suggestions — homework and talking points update in real time as the session unfolds',
    'Your calendar synced automatically, with a meeting link created for every session',
    'Message patients directly by email',
    'Priority support — first in line when you need help',
  ],
  clinic: ['Everything in Ultra', 'Multiple therapist seats', 'Admin dashboard', 'White-label option'],
};

export function upgradeMessage(feature: 'online sessions' | 'Google Calendar sync' | 'patient messaging'): string {
  return `Upgrade to Pro or Ultra to unlock ${feature}.`;
}
