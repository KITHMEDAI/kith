import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { IS_WORKSPACE } from '@/lib/workspace/server';

export const metadata: Metadata = {
  title: { default: 'Kith Workspace', template: '%s · Kith Workspace' },
  description: 'AI notes for any kind of work: record or type, get a clean, structured note.',
  robots: { index: false, follow: false },
};

export default function WorkspaceRoot({ children }: { children: React.ReactNode }) {
  if (!IS_WORKSPACE) notFound();
  return <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</div>;
}
