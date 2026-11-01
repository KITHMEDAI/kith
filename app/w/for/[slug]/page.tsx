import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UseCaseLanding } from '@/components/workspace/Landing';
import { USE_CASES, USE_CASE_MAP } from '@/lib/workspace/use-cases';
import { useCaseLd, ldJson, socialMeta } from '@/lib/workspace/site';

export function generateStaticParams() {
  return USE_CASES.map(u => ({ slug: u.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const u = USE_CASE_MAP[params.slug];
  if (!u) return {};
  const path = `/for/${u.slug}`;
  return {
    title: { absolute: u.seoTitle },
    description: u.seoDescription,
    alternates: { canonical: path },
    ...socialMeta(u.seoTitle, u.seoDescription, path),
    robots: { index: true, follow: true },
  };
}

export default function UseCasePage({ params }: { params: { slug: string } }) {
  const u = USE_CASE_MAP[params.slug];
  if (!u) notFound();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(useCaseLd(u)) }} />
      <UseCaseLanding u={u} />
    </>
  );
}
