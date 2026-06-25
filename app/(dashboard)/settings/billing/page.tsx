'use client';

import { useEffect, useState } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { CreditCard, CheckCircle2, Zap, Building2, Loader2 } from 'lucide-react';

interface BillingInfo {
  therapist_id: string;
  subscription_plan: 'starter' | 'pro' | 'clinic';
  subscription_status: string;
  trial_ends_at: string | null;
  sessions_this_month: number;
}

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '₹999',
    period: '/month',
    icon: Zap,
    color: '#9CA3AF',
    features: ['Up to 30 sessions/month', 'SOAP & DAP notes', 'Email notifications', 'Basic dashboard'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '₹2,499',
    period: '/month',
    icon: CheckCircle2,
    color: '#7c3aed',
    recommended: true,
    features: ['Unlimited sessions', 'All note formats', 'SMS + WhatsApp', 'Growth analytics', 'Google Calendar sync', 'Priority support'],
  },
  {
    key: 'clinic',
    name: 'Clinic',
    price: '₹5,999',
    period: '/month',
    icon: Building2,
    color: '#0ea5e9',
    features: ['Everything in Pro', 'Up to 10 therapists', 'Admin dashboard', 'White-label option', 'Dedicated support', 'BAA available'],
  },
];

export default function BillingPage() {
  const supabase = createClientSupabaseClient();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay SDK
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch therapist profile (includes subscription info)
      const { data: t } = await supabase
        .from('therapists')
        .select('id, subscription_plan, subscription_status, trial_ends_at')
        .eq('user_id', user.id)
        .single();

      if (!t) { setLoading(false); return; }

      // Count sessions this month using therapist.id (not user.id)
      const startOfMonth = new Date();
      startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('therapist_id', t.id)
        .gte('started_at', startOfMonth.toISOString());

      setInfo({
        therapist_id: t.id,
        subscription_plan: t.subscription_plan || 'starter',
        subscription_status: t.subscription_status || 'trialing',
        trial_ends_at: t.trial_ends_at || null,
        sessions_this_month: count || 0,
      });
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpgrade(plan: string) {
    if (!razorpayLoaded) {
      alert('Payment system loading — please try again in a moment.');
      return;
    }
    setUpgrading(plan);
    try {
      const res = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Payment initiation failed. Please check Razorpay configuration.');
        setUpgrading(null);
        return;
      }

      const options = {
        key: data.key,
        order_id: data.order_id,
        name: 'Kith Clinical AI',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — Monthly`,
        theme: { color: '#7c3aed' },
        prefill: {},
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const verify = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, plan }),
          });
          if (verify.ok) window.location.reload();
          else alert('Payment verification failed — contact support@kith.in');
        },
        modal: { ondismiss: () => setUpgrading(null) },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (window as any).Razorpay(options).open();
    } catch {
      alert('Payment failed — please try again.');
      setUpgrading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    );
  }

  const trialDaysLeft = info?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(info.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;

  const isTrialing = info?.subscription_status === 'trialing';

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription</p>
      </div>

      {/* Current status */}
      <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-5 flex items-center gap-4 shadow-sm">
        <CreditCard className="h-8 w-8 text-violet-500 flex-none" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {info?.subscription_plan === 'starter' ? 'Starter' : info?.subscription_plan === 'pro' ? 'Pro' : 'Clinic'} Plan
            {isTrialing && <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Trial</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isTrialing && trialDaysLeft !== null
              ? trialDaysLeft > 0 ? `${trialDaysLeft} days left in free trial` : 'Trial expired'
              : `Status: ${info?.subscription_status}`}
          </p>
        </div>
      </div>

      {/* Usage bar for Starter */}
      {info?.subscription_plan === 'starter' && (
        <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Sessions this month</p>
            <p className="text-sm font-semibold text-foreground">{info.sessions_this_month} / 30</p>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                info.sessions_this_month >= 27 ? 'bg-red-500' : info.sessions_this_month >= 20 ? 'bg-amber-500' : 'bg-violet-500'
              }`}
              style={{ width: `${Math.min(100, (info.sessions_this_month / 30) * 100)}%` }}
            />
          </div>
          {info.sessions_this_month >= 27 && (
            <p className="text-xs text-red-600 mt-2">Approaching monthly limit — upgrade to Pro for unlimited sessions</p>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map(plan => {
          const isCurrent = info?.subscription_plan === plan.key;
          const Icon = plan.icon;
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
                <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                <span className="text-xs text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-none" />
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => !isCurrent && handleUpgrade(plan.key)}
                disabled={isCurrent || upgrading === plan.key}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isCurrent
                    ? 'bg-muted text-muted-foreground cursor-default'
                    : plan.recommended
                    ? 'bg-violet-600 hover:bg-violet-700 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}>
                {upgrading === plan.key && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isCurrent ? 'Current plan' : 'Upgrade'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        All plans include 14-day free trial · Payments via Razorpay (INR) · Cancel anytime · GST applicable
      </p>
    </div>
  );
}
