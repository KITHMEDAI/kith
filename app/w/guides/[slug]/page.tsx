import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Header, Footer, ExampleCard, FaqSection, btn, signupHref } from '@/components/workspace/Landing';
import { GUIDES, GUIDE_MAP, type GuideSection } from '@/lib/workspace/guides';
import { USE_CASE_MAP } from '@/lib/workspace/use-cases';
import { guideLd, ldJson, socialMeta } from '@/lib/workspace/site';

export function generateStaticParams() {
  return GUIDES.map(g => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = GUIDE_MAP[params.slug];
  if (!g) return {};
  const path = `/guides/${g.slug}`;
  return {
    title: { absolute: g.seoTitle },
    description: g.seoDescription,
    alternates: { canonical: path },
    ...socialMeta(g.seoTitle, g.seoDescription, path, { published: g.published, updated: g.updated }),
    robots: { index: true, follow: true },
  };
}

const longDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

function Section({ s }: { s: GuideSection }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{s.heading}</h2>
      {s.paras?.map(p => <p key={p} className="mt-3 leading-relaxed text-slate-700">{p}</p>)}
      {s.bullets && (
        <ul className="mt-3 space-y-2 text-slate-700">
          {s.bullets.map(b => <li key={b} className="flex gap-2 leading-relaxed"><span className="text-violet-500">•</span><span>{b}</span></li>)}
        </ul>
      )}
      {s.table && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-900">
              <tr>{s.table.head.map(h => <th key={h} scope="col" className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {s.table.rows.map(r => <tr key={r.join('|')}>{r.map((c, i) => <td key={i} className="px-4 py-2.5 align-top">{c}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      )}
      {s.after?.map(p => <p key={p} className="mt-3 leading-relaxed text-slate-700">{p}</p>)}
    </section>
  );
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const g = GUIDE_MAP[params.slug];
  if (!g) notFound();
  const u = USE_CASE_MAP[g.useCase];
  // Same-topic guides first so link equity flows inside each cluster.
  const others = GUIDES.filter(o => o.slug !== g.slug).sort((a, b) => Number(b.useCase === g.useCase) - Number(a.useCase === g.useCase));
  return (
    <div className="bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(guideLd(g)) }} />
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-6 pt-6 lg:pt-10">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <a href="/" className="hover:text-slate-800">Kith Workspace</a> / <a href="/guides" className="hover:text-slate-800">Guides</a>
        </nav>
        <article>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{g.title}</h1>
          <p className="mt-2 text-sm text-slate-500">Updated {longDate(g.updated)} · Australia</p>
          <p className="mt-6 rounded-2xl border border-violet-100 bg-white p-5 text-base leading-relaxed text-slate-800">{g.summary}</p>

          {u && (
            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-relaxed text-slate-800">
                <b>Skip the typing.</b> Talk through it for two minutes on your phone and Kith writes this note for you, in this format.
              </p>
              <a href={signupHref(u.field)} className={`${btn} shrink-0 bg-violet-600 py-2.5 text-white hover:bg-violet-700`}>Try it free <ArrowRight className="h-4 w-4" aria-hidden /></a>
            </div>
          )}

          {g.sections.map((s, i) => (
            <div key={s.heading}>
              <Section s={s} />
              {/* Mid-article nudge: link to the worked example for readers who skim. */}
              {i === 1 && g.sections.length > 3 && (
                <p className="mt-6 text-sm text-slate-600">
                  Want to see it done? <a href="#example" className="font-medium text-violet-700 underline">Jump to the worked example</a>, written by Kith from a short voice note.
                </p>
              )}
            </div>
          ))}

          <section id="example" className="mt-12 scroll-mt-6">
            <h2 className="text-xl font-semibold tracking-tight">Worked example</h2>
            <p className="mt-3 leading-relaxed text-slate-700">{g.exampleIntro}</p>
            <div className="mt-4"><ExampleCard e={g.example} /></div>
          </section>

          {u && (
            <aside className="mt-10 rounded-2xl bg-slate-900 p-6 text-white">
              <p className="text-sm font-medium text-violet-300">{u.name}</p>
              <p className="mt-1 text-lg font-semibold">{u.headline}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{u.sub}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={signupHref(u.field)} className={`${btn} bg-violet-500 text-white hover:bg-violet-400`}>Start free <ArrowRight className="h-4 w-4" aria-hidden /></a>
                <a href={`/for/${u.slug}`} className={`${btn} border border-slate-600 text-white hover:bg-slate-800`}>See how Kith does it</a>
              </div>
              <p className="mt-3 text-xs text-slate-400">Free during early access. No card needed.</p>
            </aside>
          )}
        </article>
      </main>

      <div className="mx-auto max-w-3xl">
        <FaqSection faq={g.faq} title="Common questions" />
      </div>

      <section className="mx-auto max-w-3xl px-4 pb-10">
        <h2 className="text-lg font-semibold">Sources</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {g.sources.map(s => <li key={s.url}><a href={s.url} className="text-violet-700 underline" rel="noopener" target="_blank">{s.label}</a></li>)}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          This guide is general information, not legal advice. Rules and forms change: check the official sources and your organisation’s policies. Examples use made-up people and details.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-14">
        <h2 className="text-lg font-semibold">More guides</h2>
        <ul className="mt-3 space-y-2">
          {others.map(o => <li key={o.slug}><a href={`/guides/${o.slug}`} className="text-violet-700 hover:underline">{o.title}</a></li>)}
        </ul>
      </section>
      <Footer />
    </div>
  );
}
