import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Mic, FileText, CalendarClock, ShieldCheck, Video, Bell, Languages, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import KithLockup from '@/components/brand/KithLockup';
import DemoShowcase from '@/components/home/DemoShowcase';
import HomeAuth from '@/components/home/HomeAuth';
import PricingToggle from '@/components/home/PricingToggle';

const BG = 'linear-gradient(160deg, #1e0d4e 0%, #16083a 60%, #0f2a1e 100%)';

const FEATURES = [
  { icon: Mic,         title: 'Ambient transcription',      desc: 'Kith listens in the background — in-person or online. No buttons to press mid-session.' },
  { icon: FileText,    title: 'Auto SOAP notes',            desc: 'Clinically specific notes ready within a minute of ending the session.' },
  { icon: Video,       title: 'Online session bot',         desc: 'Sends a notetaker to your Google Meet automatically. Just admit it and talk.' },
  { icon: CalendarClock, title: 'Smart scheduling',         desc: 'Recurring sessions, conflict-free, with a live busy/free check.' },
  { icon: Bell,        title: 'Session reminders',          desc: '15-minute in-app alert before every booked slot.' },
  { icon: Languages,   title: 'Clinical accuracy',          desc: 'Context-aware transcription — medication names and clinical terms come through correctly.' },
];

export default async function HomePage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ background: BG }}>
        {/* Glows */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full" style={{ background: 'radial-gradient(circle,#8b5cf6,transparent 70%)', filter: 'blur(80px)' }} />
          <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full" style={{ background: 'radial-gradient(circle,#10b981,transparent 70%)', filter: 'blur(90px)' }} />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6 max-w-7xl mx-auto">
          <KithLockup markSize={28} className="text-[19px] tracking-[0.04em] text-white"
            gradientId="kith-nav" gradientFrom="#e9d5ff" gradientTo="#a78bfa" />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-purple-200/70 hover:text-white transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link href="/register" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-purple-50 transition-colors shadow-sm">
              Get started free
            </Link>
          </div>
        </nav>

        {/* Two-column */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-8 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
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
            <HomeAuth />
          </div>
          <div className="flex justify-center lg:justify-end">
            <DemoShowcase />
          </div>
        </div>
      </div>

      {/* ── Features — compact, Kith-blue boxes ── */}
      <div style={{ background: BG }}>
        <div className="max-w-6xl mx-auto px-6 py-14">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-purple-300/50 mb-8">Everything around the session, handled</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-xl p-4 flex gap-3 items-start"
                style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-none"
                  style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)' }}>
                  <f.icon className="h-4 w-4 text-violet-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{f.title}</p>
                  <p className="text-xs text-purple-200/55 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pricing ── */}
      <div className="relative overflow-hidden" style={{ background: BG }}>
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-full rounded-full" style={{ background: 'radial-gradient(ellipse,#7c3aed,transparent 60%)', filter: 'blur(60px)' }} />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-16"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">Plans &amp; pricing</h2>
          <p className="text-center text-sm text-purple-200/40 mb-8">Start free. No card required.</p>
          <PricingToggle />
        </div>
      </div>

      {/* ── Trust ── */}
      <div style={{ background: BG, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Lock,         title: 'Encrypted at rest & in transit', desc: 'PHI field-encrypted; audio deleted after transcription.' },
            { icon: ShieldCheck,  title: 'DPDP 2023 compliant',            desc: 'Built around India\'s data protection law from day one.' },
            { icon: CheckCircle2, title: 'Row-level security',              desc: 'Each doctor only ever sees their own patients — never another\'s.' },
          ].map(t => (
            <div key={t.title} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-none"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <t.icon className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t.title}</p>
                <p className="mt-0.5 text-xs text-purple-200/45 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="relative overflow-hidden" style={{ background: BG, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-40 w-72 rounded-full" style={{ background: 'radial-gradient(circle,#7c3aed,transparent 70%)', filter: 'blur(50px)' }} />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to try Kith in your practice?</h2>
          <p className="text-sm text-purple-200/50 mb-8">No card required. Cancel anytime.</p>
          <Link href="/register"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-violet-700 hover:bg-purple-50 transition-all shadow-lg">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ background: BG, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <KithLockup markSize={20} className="text-[14px] text-white/60" gradientId="kith-footer" gradientFrom="#e9d5ff" gradientTo="#a78bfa" />
          <p className="text-xs text-purple-300/30 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Encrypted · DPDP 2023 compliant
          </p>
          <a href="mailto:hello@kith.space" className="text-xs text-purple-300/40 hover:text-purple-200 transition-colors">
            hello@kith.space
          </a>
        </div>
      </footer>
    </div>
  );
}
