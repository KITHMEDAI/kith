import { Mic, FileText, ShieldCheck, ArrowRight, Flag } from 'lucide-react';
import KithLockup from '@/components/brand/KithLockup';
import { USE_CASES, type UseCase } from '@/lib/workspace/use-cases';

// Public marketing page for logged-out visitors (/ and /for/<slug>).
// Claims here must match the Privacy page: storage in Sydney, AI in the US.

const btn = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition';

function signupHref(field?: string) {
  return `/login?mode=signup${field ? `&field=${field}` : ''}`;
}

function Header() {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
      <a href="/" aria-label="Kith Workspace home"><KithLockup markSize={26} className="text-[19px] text-slate-900" gradientId="ws-land-grad" /></a>
      <nav className="flex items-center gap-4 text-sm">
        <a href="/login" className="text-slate-600 hover:text-slate-900">Sign in</a>
        <a href={signupHref()} className={`${btn} bg-slate-900 py-2 text-white hover:bg-slate-700`}>Start free</a>
      </nav>
    </header>
  );
}

function ExampleCard({ u }: { u: UseCase }) {
  const e = u.example;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">What you say</p>
        <p className="mt-1 text-sm italic leading-relaxed text-slate-600">{e.input}</p>
      </div>
      <div className="px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-violet-600">What Kith writes</p>
        <h3 className="mt-1 font-semibold">{e.title}</h3>
        <div className="mt-3 space-y-3">
          {e.sections.map(s => (
            <div key={s.heading}>
              <p className="text-sm font-semibold text-slate-800">{s.heading}</p>
              <ul className="mt-0.5 space-y-0.5 text-sm text-slate-600">
                {s.lines.map(l => <li key={l}>{l}</li>)}
              </ul>
            </div>
          ))}
        </div>
        {e.flag && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <Flag className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{e.flag}
          </p>
        )}
        <p className="mt-4 text-xs text-slate-400">Example with made-up details. You check and edit every note before you use it.</p>
      </div>
    </div>
  );
}

function Trust() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <Mic className="h-5 w-5 text-violet-600" aria-hidden />
          <h3 className="mt-2 font-semibold">Speak or type</h3>
          <p className="mt-1 text-sm text-slate-600">Record on your phone, record an online meeting, or paste rough notes. Works in the browser, nothing to install.</p>
        </div>
        <div>
          <FileText className="h-5 w-5 text-violet-600" aria-hidden />
          <h3 className="mt-2 font-semibold">Written in your format</h3>
          <p className="mt-1 text-sm text-slate-600">Kith only writes what you said. It doesn’t invent goals, times or advice, and it marks what’s missing so you can fill it in.</p>
        </div>
        <div>
          <ShieldCheck className="h-5 w-5 text-violet-600" aria-hidden />
          <h3 className="mt-2 font-semibold">Private by design</h3>
          <p className="mt-1 text-sm text-slate-600">Notes are stored in Sydney and encrypted. Recordings are deleted after transcription. AI processing currently runs in the US with model training switched off. <a href="/privacy" className="text-violet-700 underline">Details</a></p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500">
        <span>Kith Workspace · free during early access</span>
        <span className="flex gap-4">
          <a href="/privacy" className="hover:text-slate-800">Privacy</a>
          <a href="/terms" className="hover:text-slate-800">Terms</a>
          <a href="/help" className="hover:text-slate-800">Contact</a>
        </span>
      </div>
    </footer>
  );
}

export function UseCaseLanding({ u }: { u: UseCase }) {
  return (
    <div className="bg-slate-50">
      <Header />
      <section className="mx-auto grid max-w-5xl gap-10 px-4 pb-10 pt-6 lg:grid-cols-2 lg:items-start lg:pt-12">
        <div>
          <p className="text-sm font-medium text-violet-700">{u.name}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{u.headline}</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">{u.sub}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={signupHref(u.field)} className={`${btn} bg-violet-600 text-white hover:bg-violet-700`}>Start free <ArrowRight className="h-4 w-4" aria-hidden /></a>
            <a href="/help" className={`${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-100`}>Ask a question</a>
          </div>
          <p className="mt-3 text-xs text-slate-500">Free during early access. No card needed.</p>
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-slate-900">Sound familiar?</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              {u.pains.map(p => <li key={p} className="flex gap-2"><span className="text-violet-500">•</span>{p}</li>)}
            </ul>
            <h2 className="mt-6 text-sm font-semibold text-slate-900">Note types included</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              {u.noteTypes.map(t => <li key={t} className="flex gap-2"><span className="text-violet-500">✓</span>{t}</li>)}
            </ul>
          </div>
        </div>
        <ExampleCard u={u} />
      </section>
      <Trust />
      <OtherUses current={u.slug} />
      <Footer />
    </div>
  );
}

function OtherUses({ current }: { current?: string }) {
  const others = USE_CASES.filter(u => u.slug !== current);
  return (
    <section className="mx-auto max-w-5xl px-4 pb-14">
      <h2 className="text-lg font-semibold">{current ? 'Also used for' : 'Built for the work you do'}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {others.map(u => (
          <a key={u.slug} href={`/for/${u.slug}`} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-sm">
            <p className="font-semibold">{u.name}</p>
            <p className="mt-1 text-sm text-slate-600">{u.headline}</p>
          </a>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-500">Something else? Pick &ldquo;Other&rdquo; when you sign up and describe your work: Kith learns the format.</p>
    </section>
  );
}

export function HomeLanding() {
  const featured = USE_CASES[0];
  return (
    <div className="bg-slate-50">
      <Header />
      <section className="mx-auto grid max-w-5xl gap-10 px-4 pb-10 pt-6 lg:grid-cols-2 lg:items-start lg:pt-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Talk for two minutes. Get the note.</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Kith turns a quick voice note, a recorded meeting or rough typed notes into a clean, structured note in your industry&rsquo;s format: shift notes, care notes, site reports, handovers and minutes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={signupHref()} className={`${btn} bg-violet-600 text-white hover:bg-violet-700`}>Start free <ArrowRight className="h-4 w-4" aria-hidden /></a>
            <a href="#uses" className={`${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-100`}>See examples</a>
          </div>
          <p className="mt-3 text-xs text-slate-500">Free during early access. No card needed.</p>
        </div>
        <ExampleCard u={featured} />
      </section>
      <Trust />
      <div id="uses"><OtherUses /></div>
      <Footer />
    </div>
  );
}
