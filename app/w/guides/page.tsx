import type { Metadata } from 'next';
import { Header, Footer } from '@/components/workspace/Landing';
import { GUIDES } from '@/lib/workspace/guides';
import { USE_CASE_MAP } from '@/lib/workspace/use-cases';
import { guidesIndexLd, ldJson, socialMeta } from '@/lib/workspace/site';

const TITLE = 'Guides: NDIS Notes, Incident Reports, Site Diaries & Minutes | Kith';
const DESCRIPTION = 'Practical Australian guides to writing NDIS progress notes, reportable incidents, aged care notes, site diaries, shift handovers and meeting minutes, with examples.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/guides' },
  ...socialMeta(TITLE, DESCRIPTION, '/guides'),
  robots: { index: true, follow: true },
};

export default function GuidesPage() {
  return (
    <div className="bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(guidesIndexLd()) }} />
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-14 pt-6 lg:pt-10">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500"><a href="/" className="hover:text-slate-800">Kith Workspace</a> / Guides</nav>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Guides</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          How to write the notes and records your work depends on, with the Australian rules that apply and a worked example in each.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {GUIDES.map(g => (
            <a key={g.slug} href={`/guides/${g.slug}`} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-600">{USE_CASE_MAP[g.useCase]?.name}</p>
              <h2 className="mt-1 text-lg font-semibold">{g.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{g.seoDescription}</p>
            </a>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
