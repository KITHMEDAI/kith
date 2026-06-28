import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Mic, FileText, CalendarClock, ShieldCheck, Video, Bell,
  Languages, Lock, ArrowRight, CheckCircle2, Gift, Zap, Sparkles,
} from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import KithLockup from '@/components/brand/KithLockup';
import { PLAN_FEATURES } from '@/lib/entitlements';

const DARK_GRADIENT = 'linear-gradient(160deg, #1e0d4e 0%, #16083a 60%, #0f2a1e 100%)';

const FEATURES = [
  { icon: Mic, title: 'Listens during the session', desc: 'In-person or online — Kith transcribes the conversation accurately, even with quiet or far-away speech from across the room.' },
  { icon: FileText, title: 'Writes the SOAP note for you', desc: 'Concise, clinically specific notes generated right after the session — short bullet points, not walls of text. Review and edit in seconds.' },
  { icon: Video, title: 'Joins your online sessions', desc: 'Book a video appointment and Kith creates the Google Meet, sends a notetaker bot to join, and records — you just talk to your patient.' },
  { icon: CalendarClock, title: 'Books without double-booking', desc: 'Recurring sessions, conflict-free scheduling, and a live busy/free check as you pick a time.' },
  { icon: Bell, title: 'Reminds you before sessions start', desc: 'An in-app alert 15 minutes before a booked slot, with one click to start.' },
  { icon: Languages, title: 'Reads the room, not just the words', desc: 'Repairs low-confidence words using full conversation context — clinical terms and medication names come through correctly.' },
];

const STEPS = [
  { n: '1', title: 'Book the session', desc: 'In person, by phone, or online — Kith handles the calendar and creates a Meet link automatically.' },
  { n: '2', title: 'Just have the conversation', desc: 'Kith listens in the background. No buttons to remember, no typing during the session.' },
  { n: '3', title: 'Review the note Kith wrote', desc: 'A clinically specific SOAP note is ready within a minute or two — edit anything before it’s final.' },
];

export default async function HomePage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero (signature dark gradient — same as the sidebar / sign-in panel) ── */}
      <div className="relative overflow-hidden" style={{ background: DARK_GRADIENT }}>
        <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6 max-w-6xl mx-auto">
          <KithLockup markSize={28} className="text-[19px] tracking-[0.04em] text-white"
            gradientId="kith-home-nav" gradientFrom="#e9d5ff" gradientTo="#a78bfa" />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-purple-200 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link href="/register"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-purple-50 transition-colors shadow-sm">
              Get started free
            </Link>
          </div>
        </nav>

        <div className="relative z-10 flex flex-col items-center text-center px-6 py-20 sm:py-28 max-w-3xl mx-auto">
          <span className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-purple-200 mb-5"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
            Built for therapists &amp; clinical psychologists
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold text-white leading-tight">
            Your AI-assisted<br />clinical workspace
          </h1>
          <p className="mt-5 text-base sm:text-lg text-purple-200/90 max-w-xl leading-relaxed">
            Ambient transcription, clinically specific SOAP notes, and patient scheduling —
            so you can focus entirely on the person in front of you, not the keyboard.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <Link href="/register"
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-violet-700 hover:bg-purple-50 transition-colors shadow-lg">
              Start free — no card required <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login"
              className="rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
              Sign in
            </Link>
          </div>
          <p className="mt-5 text-xs text-purple-300/60">14-day free trial of Pro · then a Free plan forever, no card on file</p>
        </div>

        {/* Ambient glow, same palette as the in-session "listening" visual */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)', filter: 'blur(70px)' }} />
          <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)', filter: 'blur(80px)' }} />
        </div>
      </div>

      {/* ── Feature grid (light pastel background, matches the rest of the app) ── */}
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

      {/* ── How it works ── */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">How it works</h2>
          <p className="mt-3 text-sm text-slate-600">Three steps. Nothing to remember during the session itself.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
                {s.n}
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">{s.title}</p>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden sm:block absolute top-6 left-[calc(100%-1rem)] w-[calc(100%-2rem)] border-t border-dashed border-violet-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Pricing teaser — same data the real billing page uses, so the promise never drifts ── */}
      <div style={{ background: 'linear-gradient(135deg,#f3f0ff 0%,#f7f5ff 40%,#eef9f2 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Simple, honest pricing</h2>
            <p className="mt-3 text-sm text-slate-600">Start free. Upgrade only when you outgrow it.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { name: 'Free', price: '₹0', icon: Gift, features: PLAN_FEATURES.free },
              { name: 'Starter', price: '₹999', icon: Zap, features: PLAN_FEATURES.starter, highlight: false },
              { name: 'Pro', price: '₹2,499', icon: Sparkles, features: PLAN_FEATURES.pro, highlight: true },
            ].map(p => (
              <div key={p.name}
                className={`rounded-2xl p-6 flex flex-col ${p.highlight ? 'border-2 border-violet-400 bg-white shadow-lg' : 'border border-white/60 bg-white/70'} backdrop-blur-md`}>
                <div className="flex items-center gap-2 mb-1">
                  <p.icon className="h-4 w-4 text-violet-600" />
                  <span className="text-sm font-bold text-slate-900">{p.name}</span>
                </div>
                <div className="flex items-baseline gap-1 my-3">
                  <span className="text-2xl font-bold text-slate-900">{p.price}</span>
                  <span className="text-xs text-slate-500">{p.name === 'Free' ? 'forever' : '/mo'}</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-none mt-0.5" />{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center mt-8">
            <Link href="/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-800">
              See full plan details <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </div>

      {/* ── Trust / security band ── */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Lock, title: 'Encrypted at rest & in transit', desc: 'PHI and OAuth tokens are field-encrypted; audio is deleted right after transcription.' },
            { icon: ShieldCheck, title: 'DPDP 2023 compliant', desc: 'Built around India’s Digital Personal Data Protection Act from the ground up.' },
            { icon: CheckCircle2, title: 'Access-controlled by design', desc: 'Row-level security means each doctor only ever sees their own patients — never another’s.' },
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

      {/* ── Final CTA (dark gradient again, bookending the page) ── */}
      <div className="relative overflow-hidden" style={{ background: DARK_GRADIENT }}>
        <div className="relative z-10 max-w-2xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Ready to see it in your own practice?</h2>
          <p className="mt-3 text-sm text-purple-200/90">No card required to start. Cancel anytime.</p>
          <Link href="/register"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-violet-700 hover:bg-purple-50 transition-colors shadow-lg">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <KithLockup markSize={20} className="text-[14px] text-slate-700" gradientId="kith-home-footer" gradientFrom="#7c3aed" gradientTo="#5b21b6" />
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Encrypted at rest &amp; in transit · DPDP 2023 compliant
          </p>
          <a href="mailto:hello@kith.space" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
            hello@kith.space
          </a>
        </div>
      </footer>
    </div>
  );
}
