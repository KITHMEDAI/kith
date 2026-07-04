'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Gift, Zap, Sparkles, Loader2 } from 'lucide-react';
import { PLAN_FEATURES } from '@/lib/entitlements';

// USD display pricing — actually charged as the INR equivalent via Razorpay
// (see lib/razorpay.ts PLAN_PRICING). Annual = 10x monthly (2 months free).
const PLANS = [
  { name: 'Free', icon: Gift, features: PLAN_FEATURES.free, highlight: false, monthly: 0, annual: 0 },
  { name: 'Pro', icon: Zap, features: PLAN_FEATURES.pro, highlight: false, monthly: 20, annual: 200 },
  { name: 'Ultra', icon: Sparkles, features: PLAN_FEATURES.ultra, highlight: true, monthly: 50, annual: 500 },
];

export default function PricingToggle() {
  const [tab, setTab] = useState<'individual' | 'clinic'>('individual');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistState, setWaitlistState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function joinWaitlist() {
    if (!waitlistEmail.trim()) return;
    setWaitlistState('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail.trim(), type: 'clinic' }),
      });
      setWaitlistState(res.ok ? 'done' : 'error');
    } catch {
      setWaitlistState('error');
    }
  }

  return (
    <>
      {/* Toggle */}
      <div className="flex justify-center mb-10">
        <div className="flex rounded-full p-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => setTab('individual')}
            className="rounded-full px-5 py-1.5 text-sm font-semibold transition-all"
            style={{ background: tab === 'individual' ? 'rgba(255,255,255,0.12)' : 'transparent', color: tab === 'individual' ? '#fff' : 'rgba(255,255,255,0.4)' }}>
            Individual
          </button>
          <button
            onClick={() => { setTab('clinic'); setShowClinicModal(true); }}
            className="px-5 py-1.5 text-sm font-medium transition-all rounded-full"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            Clinic
          </button>
        </div>
      </div>

      {/* Clinic coming soon modal */}
      {showClinicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-2xl p-8 max-w-sm w-full mx-4 text-center"
            style={{ background: 'linear-gradient(160deg,#1e0d4e,#0f2a1e)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <div className="h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <Sparkles className="h-6 w-6 text-violet-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Clinic plans coming soon</h3>
            <p className="text-sm text-purple-200/60 mb-6 leading-relaxed">
              Multi-seat clinic accounts, shared patient records, and admin dashboards are on the roadmap. Drop your email and we'll tell you first.
            </p>
            {waitlistState === 'done' ? (
              <div className="rounded-xl py-3 px-4 mb-3 text-sm font-semibold text-emerald-300 text-center"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                ✓ You're on the list — we'll reach out when it's ready
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={waitlistEmail}
                  onChange={e => setWaitlistEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && joinWaitlist()}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-purple-300/40 outline-none focus:ring-2 focus:ring-violet-500"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                />
                <button onClick={joinWaitlist} disabled={waitlistState === 'loading'}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: 'rgba(139,92,246,0.7)', border: '1px solid rgba(167,139,250,0.4)' }}>
                  {waitlistState === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Notify me when it's ready
                </button>
                {waitlistState === 'error' && <p className="text-xs text-red-400 text-center">Something went wrong — try again</p>}
              </div>
            )}
            <button onClick={() => { setShowClinicModal(false); setTab('individual'); }}
              className="text-xs text-purple-300/50 hover:text-purple-200 transition-colors">
              Back to individual plans
            </button>
          </div>
        </div>
      )}

      {/* Monthly / annual toggle */}
      <div className="flex justify-center mb-6">
        <div className="flex rounded-full p-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {(['monthly', 'annual'] as const).map(opt => (
            <button key={opt} onClick={() => setBilling(opt)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
              style={{ background: billing === opt ? 'rgba(255,255,255,0.12)' : 'transparent', color: billing === opt ? '#fff' : 'rgba(255,255,255,0.4)' }}>
              {opt === 'monthly' ? 'Monthly' : 'Annual'}
              {opt === 'annual' && <span className="ml-1.5 text-[10px] font-bold text-emerald-400">2 months free</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map(p => (
          <div key={p.name} className="rounded-2xl p-6 flex flex-col relative"
            style={{
              background: p.highlight ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.05)',
              border: p.highlight ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.1)',
            }}>
            {p.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-violet-500 text-white">
                Most popular
              </span>
            )}
            <p.icon className="h-6 w-6 mb-3" style={{ color: p.highlight ? '#c4b5fd' : 'rgba(255,255,255,0.4)' }} strokeWidth={1.5} />
            <p className="text-base font-bold text-white">{p.name}</p>
            <p className="text-xs text-purple-300/50 mb-3">{p.name === 'Free' ? 'Free forever' : billing === 'monthly' ? 'Per month' : 'Per year'}</p>
            <div className="mb-4">
              <span className="text-3xl font-bold text-white">${billing === 'monthly' ? p.monthly : p.annual}</span>
              {p.name !== 'Free' && <span className="text-sm text-purple-300/40 ml-1">/{billing === 'monthly' ? 'mo' : 'yr'}</span>}
            </div>
            <Link href="/register"
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-center mb-4 block transition-all"
              style={{
                background: p.highlight ? 'rgba(139,92,246,0.8)' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                border: p.highlight ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.1)',
              }}>
              Get started
            </Link>
            <ul className="space-y-2 flex-1">
              {p.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-purple-200/55">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-none mt-0.5" />{f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
