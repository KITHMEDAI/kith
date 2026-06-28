'use client';

import { useEffect, useState } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { CreditCard, CheckCircle2, Zap, Building2, Loader2, Gift } from 'lucide-react';

interface BillingInfo {
  therapist_id: string;
  subscription_plan: 'free' | 'starter' | 'pro' | 'clinic';
  subscription_status: string;
  billing_interval: 'monthly' | 'annual';
  trial_ends_at: string | null;
  sessions_this_month: number;
}

type Tier = 'starter' | 'pro';
type Interval = 'monthly' | 'annual';

const PRICING: Record<Tier, { monthly: number; annual: number }> = {
  starter: { monthly: 999, annual: 9990 },
  pro: { monthly: 2499, annual: 24990 },
};

const PAID_PLANS: Array<{
  key: Tier; name: string; icon: typeof Zap; color: string; recommended?: boolean;
  features: string[]; cap: string;
}> = [
  {
    key: 'starter', name: 'Starter', icon: Zap, color: '#9CA3AF', cap: '30 sessions/month',
    features: ['30 sessions/month', 'AI-assisted SOAP notes', 'Online sessions (notetaker bot)', 'Google Calendar sync'],
  },
  {
    key: 'pro', name: 'Pro', icon: CheckCircle2, color: '#7c3aed', recommended: true, cap: 'Unlimited sessions',
    features: ['Unlimited sessions', 'Everything in Starter', 'WhatsApp & SMS to patients', 'Priority support'],
  },
];

export default function BillingPage() {
  const supabase = createClientSupabaseClient();
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

  const trialDaysLeft = info?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(info.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;
  const isTrialing = info?.subscription_status === 'trialing' && (trialDaysLeft ?? 0) > 0;
  const isActivePaid = info?.subscription_status === 'active';
  const effectivePlan = isTrialing ? 'pro' : (info?.subscription_plan ?? 'free');

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
        description: `${tier === 'pro' ? 'Pro' : 'Starter'} plan — billed ${interval}`,
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
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription</p>
      </div>

      {/* Current status */}
      <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-5 flex items-center gap-4 shadow-sm">
        <CreditCard className="h-8 w-8 text-violet-500 flex-none" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground capitalize">
            {effectivePlan} Plan
            {isTrialing && <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Trial — full Pro access</span>}
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

      {/* Usage bar — shown whenever the effective plan is capped */}
      {effectivePlan !== 'pro' && (
        <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Sessions this month</p>
            <p className="text-sm font-semibold text-foreground">
              {info?.sessions_this_month} / {effectivePlan === 'starter' ? 30 : 5}
            </p>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${Math.min(100, (info.sessions_this_month / (effectivePlan === 'starter' ? 30 : 5)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Monthly / annual toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${interval === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
        <button onClick={() => setInterval_(i => i === 'monthly' ? 'annual' : 'monthly')}
          className={`relative h-6 w-11 rounded-full transition-colors ${interval === 'annual' ? 'bg-violet-600' : 'bg-muted'}`}>
          <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${interval === 'annual' ? 'translate-x-5' : ''}`} />
        </button>
        <span className={`text-sm font-medium ${interval === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
          Annual <span className="text-emerald-600 font-semibold">— 2 months free</span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Free */}
        <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-slate-100"><Gift className="h-4 w-4 text-slate-500" /></div>
            <span className="text-sm font-bold text-foreground">Free</span>
          </div>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-2xl font-bold text-foreground">₹0</span>
            <span className="text-xs text-muted-foreground">forever</span>
          </div>
          <ul className="space-y-2 mb-5">
            {['5 sessions/month', 'AI-assisted SOAP notes', 'In-person recording', 'Patient & booking management'].map(f => (
              <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-none" />{f}
              </li>
            ))}
          </ul>
          <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center bg-muted text-muted-foreground">
            {effectivePlan === 'free' ? 'Current plan' : 'Always available'}
          </div>
        </div>

        {/* Starter / Pro */}
        {PAID_PLANS.map(plan => {
          const isCurrent = isActivePaid && info?.subscription_plan === plan.key;
          const Icon = plan.icon;
          const price = PRICING[plan.key][interval];
          return (
            <div key={plan.key}
              className={`rounded-xl border p-5 relative ${plan.recommended ? 'border-violet-300 bg-violet-50/60' : 'border-white/40 bg-white/60'} backdrop-blur-md shadow-sm`}>
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-violet-600 text-white text-[10px] font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg" style={{ background: `${plan.color}18` }}>
                  <Icon className="h-4 w-4" style={{ color: plan.color }} />
                </div>
                <span className="text-sm font-bold text-foreground">{plan.name}</span>
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-bold text-foreground">₹{price.toLocaleString('en-IN')}</span>
                <span className="text-xs text-muted-foreground">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              <ul className="space-y-2 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-none" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => !isCurrent && handleSubscribe(plan.key)}
                disabled={isCurrent || busy === plan.key}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isCurrent ? 'bg-muted text-muted-foreground cursor-default'
                  : plan.recommended ? 'bg-violet-600 hover:bg-violet-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}>
                {busy === plan.key && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isCurrent ? 'Current plan' : 'Subscribe'}
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
        Payments via Razorpay (INR) · UPI Autopay or card e-mandate · Cancel anytime, no lock-in
      </p>
    </div>
  );
}
