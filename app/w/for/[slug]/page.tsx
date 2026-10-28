import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UseCaseLanding } from '@/components/workspace/Landing';
import { USE_CASES, USE_CASE_MAP } from '@/lib/workspace/use-cases';

export function generateStaticParams() {
  return USE_CASES.map(u => ({ slug: u.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const u = USE_CASE_MAP[params.slug];
  if (!u) return {};
  return {
    title: { absolute: `${u.headline} · Kith for ${u.name}` },
    description: u.sub,
    robots: { index: true, follow: true },
  };
}

export default function UseCasePage({ params }: { params: { slug: string } }) {
  const u = USE_CASE_MAP[params.slug];
  if (!u) notFound();
  return <UseCaseLanding u={u} />;
}
