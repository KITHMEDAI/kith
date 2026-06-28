import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Mic, FileText, CalendarClock, ShieldCheck } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import KithLockup from '@/components/brand/KithLockup';

// Public marketing homepage. Logged-in visitors are sent straight to their
// workspace — this page is only ever seen by anonymous visitors (and is what
// link-preview crawlers, payment-provider site checks, etc. see at the root
// domain, so it must return real content with no redirect chain).
export default async function HomePage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-6">
        <KithLockup markSize={28} className="text-[19px] tracking-[0.04em] text-slate-900"
          gradientId="kith-home" gradientFrom="#7c3aed" gradientTo="#5b21b6" />
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
            Sign in
          </Link>
          <Link href="/register"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm">
            Get started free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 max-w-2xl leading-tight">
          Your AI-assisted clinical workspace
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
          Ambient transcription, intelligent SOAP notes, and patient management —
          so you can focus entirely on the person in front of you.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link href="/register"
            className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200">
            Start free — no card required
          </Link>
          <Link href="/login"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
            Sign in
          </Link>
        </div>

        {/* Feature row */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl text-left">
          {[
            { icon: Mic, title: 'Listens during the session', desc: 'In-person or online — Kith transcribes the conversation accurately, even with quiet or far-away speech.' },
            { icon: FileText, title: 'Writes the SOAP note for you', desc: 'Concise, clinically specific notes generated right after the session, ready to review and edit.' },
            { icon: CalendarClock, title: 'Books and reminds', desc: 'Recurring sessions, conflict-free scheduling, and a Google Meet created automatically for online sessions.' },
          ].map(f => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white/70 p-5">
              <f.icon className="h-5 w-5 text-violet-600 mb-2.5" />
              <p className="text-sm font-semibold text-slate-900">{f.title}</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="flex items-center justify-center gap-1.5 px-6 py-6 text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        Encrypted at rest &amp; in transit · DPDP 2023 compliant
      </footer>
    </div>
  );
}
