import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import KithLockup from '@/components/brand/KithLockup';
import { getAllPosts } from '@/lib/blog';

const BG = 'linear-gradient(160deg, #1e0d4e 0%, #16083a 60%, #0f2a1e 100%)';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kith.space';
const TITLE = 'Blog — Kith';
const DESCRIPTION = 'Practical guides on AI clinical documentation, running a private therapy practice, and clinical note-writing — from the team behind Kith.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}/blog` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${BASE_URL}/blog`, type: 'website' },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-white">
      <div style={{ background: BG }}>
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-purple-200/60 hover:text-white transition-colors mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Kith
          </Link>
          <KithLockup markSize={24} className="text-[17px] text-white" gradientId="kith-blog" gradientFrom="#e9d5ff" gradientTo="#a78bfa" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-6">Blog</h1>
          <p className="text-sm text-purple-200/60 mt-2">Notes on AI clinical documentation and running a private practice.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet — check back soon.</p>
        ) : (
          <div className="space-y-6">
            {posts.map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`}
                className="block rounded-xl border border-slate-200 p-5 hover:border-violet-300 hover:bg-violet-50/30 transition-colors">
                <p className="text-xs text-muted-foreground">
                  {new Date(post.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <h2 className="text-lg font-semibold text-foreground mt-1">{post.title}</h2>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{post.description}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 mt-3">
                  Read more <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
