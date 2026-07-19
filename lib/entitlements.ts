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
  calendarSync: boolean;      // Google Calendar connect (Pro+); auto Meet+invite creation is gated separately below
  autoMeetAndInvite: boolean; // Kith auto-creates the Google Meet + auto-emails the patient on booking — Ultra+ only
  patientMessaging: boolean;  // WhatsApp / SMS to patients
  groupSessionTypes: boolean; // couples / family / group session types (Free = individual only)
  liveOnlineUpdates: boolean; // multilingual transcript streaming for online (bot) sessions — Ultra+ only, costs extra per Recall session.
                              // Runs in Recall's accuracy-priority mode (not low-latency) so non-English/code-switched
                              // speech transcribes correctly — tradeoff is transcript.data events land 3-10 min behind
                              // real time rather than 1-3s, so in-session suggestions lag rather than being truly live.
}

interface BillingFields {
  subscription_plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  cancel_at?: string | null; // set when the doctor cancels — access lapses at this timestamp, not immediately
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
  // A cancelled subscription keeps subscription_status = 'active' through the
  // paid-through period (see app/api/billing/cancel/route.ts) — cancel_at is
  // the actual lapse point. Checking it here (not just relying on Razorpay's
  // webhook to eventually flip subscription_status) means access lapses on
  // time even if that webhook never fires.
  const notLapsed = !t.cancel_at || new Date(t.cancel_at).getTime() > Date.now();
  const paidActive = t.subscription_status === 'active' && notLapsed;
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
    autoMeetAndInvite: plan === 'ultra' || plan === 'clinic',
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
    'Your calendar synced automatically — bring your own Teams/Zoom/Meet link',
  ],
  ultra: [
    'Unlimited sessions, 120 minutes each',
    'Online sessions with in-session suggestions — homework and talking points update as the session progresses, in any supported language',
    'A meeting link is created and emailed to the patient automatically for every online session',
    'Message patients directly by email',
    'Priority support — first in line when you need help',
  ],
  clinic: ['Everything in Ultra', 'Multiple therapist seats', 'Admin dashboard', 'White-label option'],
};

export function upgradeMessage(feature: 'online sessions' | 'Google Calendar sync' | 'patient messaging' | 'automatic Meet creation'): string {
  if (feature === 'automatic Meet creation') return 'Upgrade to Ultra so Kith creates the Meet link and emails it to the patient automatically.';
  return `Upgrade to Pro or Ultra to unlock ${feature}.`;
}
