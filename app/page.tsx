import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Mic, FileText, CalendarClock, ShieldCheck, Video, Bell,
  Languages, Lock, ArrowRight, CheckCircle2, Gift, Zap, Sparkles,
} from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import KithLockup from '@/components/brand/KithLockup';
import { PLAN_FEATURES } from '@/lib/entitlements';
import DemoShowcase from '@/components/home/DemoShowcase';

const BG = 'linear-gradient(160deg, #1e0d4e 0%, #16083a 60%, #0f2a1e 100%)';

const FEATURES = [
  { icon: Mic, title: 'Listens during the session', desc: 'In-person or online — Kith transcribes the conversation accurately, even with quiet speech from across the room.' },
  { icon: FileText, title: 'Writes the SOAP note for you', desc: 'Concise, clinically specific notes generated right after the session — short bullet points. Review and edit in seconds.' },
  { icon: Video, title: 'Joins your online sessions', desc: 'Kith sends a notetaker bot to your Google Meet, records everything, and generates notes when the call ends.' },
  { icon: CalendarClock, title: 'Books without double-booking', desc: 'Recurring sessions, conflict-free scheduling, and a live busy/free check as you pick a time.' },
  { icon: Bell, title: 'Reminds you before sessions', desc: 'An in-app alert 15 minutes before a booked slot, with one click to start.' },
  { icon: Languages, title: 'Clinical accuracy built-in', desc: 'Repairs low-confidence words using full conversation context — clinical terms and medication names come through correctly.' },
];

export default async function HomePage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero — dark gradient, two-column ── */}
      <div className="relative overflow-hidden" style={{ background: BG }}>

        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full"
            style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)', filter: 'blur(80px)' }} />
          <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full"
            style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)', filter: 'blur(90px)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full"
            style={{ background: 'radial-gradient(circle, #2563eb, transparent 70%)', filter: 'blur(100px)', opacity: 0.3 }} />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6 max-w-7xl mx-auto">
          <KithLockup markSize={28} className="text-[19px] tracking-[0.04em] text-white"
            gradientId="kith-home-nav" gradientFrom="#e9d5ff" gradientTo="#a78bfa" />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-purple-200/70 hover:text-white transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link href="/register"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-purple-50 transition-colors shadow-sm">
              Get started free
            </Link>
          </div>
        </nav>

        {/* Two-column hero */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-8 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

          {/* Left — copy + auth */}
          <div className="flex flex-col items-start">
            <span className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-purple-200 mb-6"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              Built for therapists &amp; clinical psychologists
            </span>

            <h1 className="text-4xl sm:text-5xl xl:text-[3.5rem] font-bold text-white leading-[1.1] tracking-tight mb-5">
              Listen to patients,<br />
              <span className="text-purple-300/60">not keyboards.</span>
            </h1>

            <p className="text-base sm:text-lg text-purple-200/70 max-w-md leading-relaxed mb-10">
              Ambient transcription, clinically specific SOAP notes, and scheduling — so every session goes to the patient, not the paperwork.
            </p>

            {/* Auth panel */}
            <div className="w-full max-w-sm space-y-3">
              <Link href="/register"
                className="flex items-center justify-center gap-3 w-full rounded-2xl py-3.5 text-sm font-semibold bg-white text-violet-700 hover:bg-purple-50 transition-all shadow-lg">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Link>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-purple-300/40">OR</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <Link href="/register"
                className="flex items-center justify-center w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.07)' }}>
                Sign up with email
              </Link>

              <p className="text-center text-xs text-purple-300/50">
                Already have an account?{' '}
                <Link href="/login" className="text-purple-200/80 underline hover:text-white transition-colors">Sign in</Link>
              </p>

              <p className="text-center text-xs text-purple-300/30">
                14-day Pro trial · Free plan forever · No card required
              </p>
            </div>
          </div>

          {/* Right — animated demo */}
          <div className="flex justify-center lg:justify-end">
            <DemoShowcase />
          </div>
        </div>
      </div>

      {/* ── Features — light pastel ── */}
      <div style={{ background: 'linear-gradient(135deg,#f3f0ff 0%,#f7f5ff 40%,#eef9f2 100%)' }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Everything around the session, handled</h2>
            <p className="mt-3 text-sm text-slate-600">Not just notes — the whole administrative layer of running a practice.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md p-5 shadow-sm">
                <div className="h-9 w-9 rounded-xl bg-violet-100 flex items-center justify-center mb-3">
                  <f.icon className="h-4 w-4 text-violet-600" />
                </div>
                <p className="text-sm font-semibold text-slate-900">{f.title}</p>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pricing — dark gradient, Claude card layout ── */}
      <div className="relative overflow-hidden" style={{ background: BG }}>
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full"
            style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)', filter: 'blur(70px)' }} />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full"
            style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)', filter: 'blur(70px)' }} />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Simple, honest pricing</h2>
            <p className="mt-2 text-sm text-purple-200/60">Start free. Upgrade only when you outgrow it.</p>
          </div>

          {/* Toggle — visual only */}
          <div className="flex justify-center mb-12">
            <div className="flex rounded-full p-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="rounded-full px-5 py-1.5 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.12)' }}>Individual</span>
              <span className="px-5 py-1.5 text-sm font-medium text-purple-300/40">Team &amp; Enterprise</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: 'Free', price: '₹0', sub: 'Free forever', icon: Gift, features: PLAN_FEATURES.free, highlight: false },
              { name: 'Starter', price: '₹999', sub: 'Per month', icon: Zap, features: PLAN_FEATURES.starter, highlight: false },
              { name: 'Pro', price: '₹2,499', sub: 'Per month', icon: Sparkles, features: PLAN_FEATURES.pro, highlight: true },
            ].map(p => (
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
                <p.icon className="h-7 w-7 mb-4" style={{ color: p.highlight ? '#c4b5fd' : 'rgba(255,255,255,0.4)' }} strokeWidth={1.5} />
                <p className="text-lg font-bold text-white">{p.name}</p>
                <p className="text-sm text-purple-300/50 mb-4">{p.sub}</p>
                <div className="mb-5">
                  <span className="text-3xl font-bold text-white">{p.price}</span>
                  {p.name !== 'Free' && <span className="text-sm text-purple-300/40 ml-1">/mo</span>}
                </div>
                <Link href="/register"
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-center mb-5 block transition-all"
                  style={{
                    background: p.highlight ? 'rgba(139,92,246,0.8)' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: p.highlight ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.12)',
                  }}>
                  Try {p.name}
                </Link>
                <ul className="space-y-2.5 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-purple-200/60">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-none mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Trust — light ── */}
      <div style={{ background: 'linear-gradient(135deg,#f3f0ff 0%,#f7f5ff 40%,#eef9f2 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: Lock, title: 'Encrypted at rest & in transit', desc: 'PHI and OAuth tokens are field-encrypted; audio is deleted right after transcription.' },
            { icon: ShieldCheck, title: 'DPDP 2023 compliant', desc: 'Built around India\'s Digital Personal Data Protection Act from the ground up.' },
            { icon: CheckCircle2, title: 'Access-controlled by design', desc: 'Row-level security means each doctor only ever sees their own patients.' },
          ].map(t => (
            <div key={t.title} className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-violet-100 flex items-center justify-center flex-none">
                <t.icon className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Final CTA — dark gradient ── */}
      <div className="relative overflow-hidden" style={{ background: BG }}>
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full"
            style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)', filter: 'blur(60px)' }} />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to see it in your practice?</h2>
          <p className="text-sm text-purple-200/60 mb-8">No card required. Cancel anytime.</p>
          <Link href="/register"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-violet-700 hover:bg-purple-50 transition-all shadow-lg">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <KithLockup markSize={20} className="text-[14px] text-slate-700" gradientId="kith-footer" gradientFrom="#7c3aed" gradientTo="#5b21b6" />
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Encrypted · DPDP 2023 compliant
          </p>
          <a href="mailto:hello@kith.space" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
            hello@kith.space
          </a>
        </div>
      </footer>
    </div>
  );
}
