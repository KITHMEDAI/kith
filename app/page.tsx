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
    <div className="min-h-screen" style={{ background: '#0a0a12', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5 max-w-7xl mx-auto">
        <KithLockup markSize={26} className="text-[18px] tracking-[0.04em] text-white"
          gradientId="kith-nav" gradientFrom="#e9d5ff" gradientTo="#a78bfa" />
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="text-sm font-medium transition-colors px-4 py-2 rounded-lg"
            style={{ color: 'rgba(255,255,255,0.65)' }}>
            Sign in
          </Link>
          <Link href="/register"
            className="text-sm font-semibold rounded-xl px-4 py-2 transition-all"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}>
            Get started free
          </Link>
        </div>
      </nav>

      {/* ── Hero — Claude style: left=copy+auth, right=demo ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 pt-12 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[82vh]">

        {/* Left: headline + sign-in/up */}
        <div className="flex flex-col items-start">
          <span className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest mb-6"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd' }}>
            Built for therapists & clinical psychologists
          </span>

          <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight mb-5">
            Listen to patients,<br />
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>not keyboards.</span>
          </h1>

          <p className="text-base sm:text-lg mb-10 max-w-md leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Ambient transcription, clinically specific SOAP notes, and patient scheduling — so every session goes to the patient, not the paperwork.
          </p>

          {/* Auth panel — Claude style */}
          <div className="w-full max-w-sm space-y-3">
            <Link href="/register"
              className="flex items-center justify-center gap-3 w-full rounded-2xl py-3.5 text-sm font-semibold transition-all"
              style={{ background: '#fff', color: '#1a0a3e' }}>
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>OR</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <Link href="/register"
              className="flex items-center justify-center w-full rounded-2xl py-3.5 text-sm font-semibold border transition-all"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
              Sign up with email
            </Link>

            <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Already have an account?{' '}
              <Link href="/login" className="underline" style={{ color: 'rgba(255,255,255,0.55)' }}>Sign in</Link>
            </p>

            <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
              14-day Pro trial · Free plan forever · No card required
            </p>
          </div>
        </div>

        {/* Right: animated app demo */}
        <div className="flex justify-center lg:justify-end">
          <DemoShowcase />
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Everything around the session, handled</h2>
            <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Not just notes — the whole administrative layer of running a practice.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="h-8 w-8 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
                  <f.icon className="h-4 w-4 text-violet-400" />
                </div>
                <p className="text-sm font-semibold text-white mb-1.5">{f.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pricing — Claude style ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center max-w-xl mx-auto mb-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Explore plans</h2>
          </div>

          {/* Toggle — static, visual only */}
          <div className="flex justify-center mb-12">
            <div className="flex rounded-full p-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="rounded-full px-5 py-1.5 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>Individual</span>
              <span className="px-5 py-1.5 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Team & Enterprise</span>
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
                  background: p.highlight ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
                  border: p.highlight ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)',
                }}>
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                    style={{ background: '#7c3aed', color: '#fff' }}>
                    Most popular
                  </span>
                )}
                {/* Icon */}
                <div className="mb-4">
                  <p.icon className="h-7 w-7" style={{ color: p.highlight ? '#a78bfa' : 'rgba(255,255,255,0.4)' }} strokeWidth={1.5} />
                </div>
                <p className="text-lg font-bold text-white">{p.name}</p>
                <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>{p.sub}</p>

                <div className="mb-5">
                  <span className="text-3xl font-bold text-white">{p.price}</span>
                  {p.name !== 'Free' && <span className="text-sm ml-1" style={{ color: 'rgba(255,255,255,0.35)' }}>/mo</span>}
                </div>

                <Link href="/register"
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-center mb-5 block transition-all"
                  style={{
                    background: p.highlight ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    border: p.highlight ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  }}>
                  Try {p.name}
                </Link>

                <ul className="space-y-2.5 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-none mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Trust ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { icon: Lock, title: 'Encrypted at rest & in transit', desc: 'PHI and OAuth tokens are field-encrypted; audio is deleted right after transcription.' },
            { icon: ShieldCheck, title: 'DPDP 2023 compliant', desc: 'Built around India\'s Digital Personal Data Protection Act from the ground up.' },
            { icon: CheckCircle2, title: 'Access-controlled by design', desc: 'Row-level security means each doctor only ever sees their own patients.' },
          ].map(t => (
            <div key={t.title} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-none"
                style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <t.icon className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t.title}</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Final CTA ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to see it in your practice?</h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>No card required. Cancel anytime.</p>
          <Link href="/register"
            className="inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-bold text-white transition-all"
            style={{ background: '#7c3aed', boxShadow: '0 0 32px rgba(124,58,237,0.4)' }}>
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <KithLockup markSize={20} className="text-[14px] text-white/60" gradientId="kith-footer" gradientFrom="#7c3aed" gradientTo="#5b21b6" />
          <p className="text-xs flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <ShieldCheck className="h-3.5 w-3.5" /> Encrypted · DPDP 2023 compliant
          </p>
          <a href="mailto:hello@kith.space" className="text-xs transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>
            hello@kith.space
          </a>
        </div>
      </footer>
    </div>
  );
}
