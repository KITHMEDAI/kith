'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { CreditCard, CheckCircle2, Zap, Building2, Loader2, Gift, Sparkles } from 'lucide-react';
import { PLAN_FEATURES, SESSION_DURATION_CAPS } from '@/lib/entitlements';

interface BillingInfo {
  therapist_id: string;
  subscription_plan: 'free' | 'pro' | 'ultra' | 'clinic';
  subscription_status: string;
  billing_interval: 'monthly' | 'annual';
  trial_ends_at: string | null;
  sessions_this_month: number;
}

type Tier = 'pro' | 'ultra';
type Interval = 'monthly' | 'annual';

// USD display pricing — actually charged as the INR equivalent via Razorpay
// (see lib/razorpay.ts PLAN_PRICING). Annual = 10x monthly (2 months free).
const PRICING: Record<Tier, { monthly: number; annual: number }> = {
  pro: { monthly: 20, annual: 200 },
  ultra: { monthly: 50, annual: 500 },
};

const SESSION_CAP_DISPLAY: Record<'free' | Tier, number | null> = {
  free: 5,
  pro: 60,
  ultra: null, // unlimited
};

const PAID_PLANS: Array<{
  key: Tier; name: string; tagline: string; icon: typeof Zap; color: string; recommended?: boolean;
}> = [
  { key: 'pro', name: 'Pro', tagline: 'For a steady solo practice', icon: Zap, color: '#7c3aed' },
  { key: 'ultra', name: 'Ultra', tagline: 'For a full-time, growing practice', icon: Sparkles, color: '#7c3aed', recommended: true },
];

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>}>
      <BillingPageInner />
    </Suspense>
  );
}

function BillingPageInner() {
  const supabase = createClientSupabaseClient();
  const searchParams = useSearchParams();
  const highlight = searchParams.get('highlight'); // 'pro' | 'ultra' — from a contextual "Enable X" upgrade link
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval_] = useState<Interval>('monthly');
  const [busy, setBusy] = useState<string | null>(null);   // 'starter' | 'pro' | 'cancel' | null
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: t, error: loadErr } = await supabase
      .from('therapists')
      .select('id, subscription_plan, subscription_status, billing_interval, trial_ends_at')
      .eq('user_id', user.id)
      .single();
    if (!t) {
      console.error('[billing] failed to load therapist row:', loadErr?.message);
      setError('Couldn’t load billing information. Try refreshing the page.');
      setLoading(false);
      return;
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('therapist_id', t.id)
      .gte('started_at', startOfMonth.toISOString());

    setInfo({
      therapist_id: t.id,
      subscription_plan: (t.subscription_plan as BillingInfo['subscription_plan']) || 'free',
      subscription_status: t.subscription_status || 'trialing',
      billing_interval: (t.billing_interval as Interval) || 'monthly',
      trial_ends_at: t.trial_ends_at || null,
      sessions_this_month: count || 0,
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll the specific plan into view when arriving from a contextual
  // "Enable Pro/Ultra" upgrade link elsewhere in the app.
  useEffect(() => {
    if (!highlight || loading) return;
    document.getElementById(`plan-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight, loading]);

  const trialDaysLeft = info?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(info.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;
  const isTrialing = info?.subscription_status === 'trialing' && (trialDaysLeft ?? 0) > 0;
  const isActivePaid = info?.subscription_status === 'active';
  const effectivePlan = isTrialing ? 'ultra' : (info?.subscription_plan ?? 'free');

  async function handleSubscribe(tier: Tier) {
    if (!razorpayLoaded) { setError('Payment system still loading — try again in a moment.'); return; }
    setBusy(tier); setError(null);
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, interval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start checkout');

      const options = {
        key: data.key,
        subscription_id: data.subscription_id,
        name: 'Kith Clinical Workspace',
        description: `${tier === 'ultra' ? 'Ultra' : 'Pro'} plan — billed ${interval}`,
        theme: { color: '#7c3aed' },
        prefill: data.prefill || {},
        handler: async (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
          const verify = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, tier, interval }),
          });
          if (verify.ok) window.location.reload();
          else setError('Payment received but verification failed — contact support, we’ll sort it out.');
        },
        modal: { ondismiss: () => setBusy(null) },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (window as any).Razorpay(options).open();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
      setBusy(null);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel your subscription? You keep full access until the current billing cycle ends, then drop to the Free plan.')) return;
    setBusy('cancel'); setError(null);
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      if (!res.ok) throw new Error('Could not cancel — try again or contact support.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="p-6 max-w-4xl">
        <p className="text-sm text-red-600">{error || 'Couldn’t load billing information.'}</p>
        <button onClick={() => { setError(null); setLoading(true); load(); }}
          className="mt-3 rounded-lg border border-input px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl space-y-7">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and see what each plan unlocks</p>
      </div>

      {/* Current status */}
      <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-5 flex items-center gap-4 shadow-sm">
        <CreditCard className="h-8 w-8 text-violet-500 flex-none" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground capitalize">
            {effectivePlan} Plan
            {isTrialing && <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Trial — full Ultra access</span>}
            {info?.subscription_status === 'past_due' && <span className="ml-2 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Payment failed</span>}
            {info?.subscription_status === 'cancelled' && <span className="ml-2 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Cancelled</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isTrialing
              ? `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left — after this you move to the Free plan unless you subscribe`
              : isActivePaid
                ? `Billed ${info?.billing_interval}`
                : 'No active subscription — capped at the Free plan limits'}
          </p>
        </div>
        {isActivePaid && (
          <button onClick={handleCancel} disabled={busy === 'cancel'}
            className="flex-none rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors">
            {busy === 'cancel' ? 'Cancelling…' : 'Cancel subscription'}
          </button>
        )}
      </div>

      {/* Usage bar — hidden once the effective plan is uncapped (Ultra/Clinic) */}
      {SESSION_CAP_DISPLAY[effectivePlan as 'free' | Tier] != null && (
        <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Sessions this month</p>
            <p className="text-sm font-semibold text-foreground">
              {info?.sessions_this_month} / {SESSION_CAP_DISPLAY[effectivePlan as 'free' | Tier]}
            </p>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${Math.min(100, (info.sessions_this_month / (SESSION_CAP_DISPLAY[effectivePlan as 'free' | Tier] ?? 1)) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Max {SESSION_DURATION_CAPS[effectivePlan]} min per session on this plan
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Monthly / annual segmented toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-full bg-muted p-1 gap-1">
          {(['monthly', 'annual'] as const).map(opt => (
            <button key={opt} onClick={() => setInterval_(opt)}
              className={`relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                interval === opt ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {opt === 'monthly' ? 'Monthly' : 'Annual'}
              {opt === 'annual' && (
                <span className="ml-1.5 text-[10px] font-bold text-emerald-600">2 months free</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards — equal height, progressive feature lists ("Everything in X, plus…") */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-stretch">
        {/* Free */}
        <div className="rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-slate-100"><Gift className="h-4 w-4 text-slate-500" /></div>
            <span className="text-base font-bold text-foreground">Free</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">For trying Kith out</p>
          <div className="flex items-baseline gap-1 mb-5">
            <span className="text-3xl font-bold text-foreground">$0</span>
            <span className="text-xs text-muted-foreground">forever</span>
          </div>
          <ul className="space-y-2.5 mb-6 flex-1">
            {PLAN_FEATURES.free.map(f => (
              <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-none mt-0.5" />{f}
              </li>
            ))}
          </ul>
          <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center bg-muted text-muted-foreground">
            {effectivePlan === 'free' ? '✓ Current plan' : 'Always available'}
          </div>
        </div>

        {/* Pro / Ultra */}
        {PAID_PLANS.map(plan => {
          const isCurrent = isActivePaid && info?.subscription_plan === plan.key;
          const isHighlighted = highlight === plan.key;
          const Icon = plan.icon;
          const price = PRICING[plan.key][interval];
          return (
            <div key={plan.key} id={`plan-${plan.key}`}
              className={`rounded-2xl border relative flex flex-col px-6 pb-6 transition-shadow ${plan.recommended ? 'pt-9 border-violet-400 bg-violet-50/70 shadow-md' : 'pt-6 border-white/40 bg-white/60 shadow-sm'} backdrop-blur-md`}
              style={isHighlighted ? { boxShadow: '0 0 0 3px rgba(124,58,237,0.6), 0 20px 40px rgba(124,58,237,0.25)' } : undefined}>
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="whitespace-nowrap bg-violet-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">MOST POPULAR</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 mb-1">
                <div className="p-2 rounded-xl bg-violet-100"><Icon className="h-4 w-4 text-violet-600" /></div>
                <span className="text-base font-bold text-foreground">{plan.name}</span>
                {isCurrent && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Current</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-4">{plan.tagline}</p>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-bold text-foreground">${price}</span>
                <span className="text-xs text-muted-foreground">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {PLAN_FEATURES[plan.key].map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-none mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => !isCurrent && handleSubscribe(plan.key)}
                disabled={isCurrent || busy === plan.key}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isCurrent ? 'bg-muted text-muted-foreground cursor-default'
                  : plan.recommended ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}>
                {busy === plan.key && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isCurrent ? '✓ Current plan' : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Clinic — not built yet, capture interest instead of selling vapourware */}
      <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm flex items-center gap-4">
        <div className="p-2 rounded-lg bg-sky-50"><Building2 className="h-5 w-5 text-sky-500" /></div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">Clinic — for teams of 3+ therapists</p>
          <p className="text-xs text-muted-foreground mt-0.5">Multi-therapist seats, an admin dashboard, and white-label options are in development.</p>
        </div>
        <a href="mailto:hello@kith.space?subject=Clinic%20plan%20interest"
          className="flex-none rounded-lg border border-input px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
          Notify me
        </a>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Prices in USD, charged as the INR equivalent via Razorpay · UPI Autopay or card e-mandate · Cancel anytime, no lock-in
      </p>
    </div>
  );
}
