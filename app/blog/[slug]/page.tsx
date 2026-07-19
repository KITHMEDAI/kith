import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import KithLockup from '@/components/brand/KithLockup';
import { getAllPosts, getPostBySlug } from '@/lib/blog';

const BG = 'linear-gradient(160deg, #1e0d4e 0%, #16083a 60%, #0f2a1e 100%)';

export function generateStaticParams() {
  return getAllPosts().map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} — Kith`,
    description: post.description,
    openGraph: { title: post.title, description: post.description, type: 'article', publishedTime: post.date },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  // Post content is authored/reviewed pre-publish (never user-submitted), so
  // rendering marked's HTML output directly is safe — this loader must never
  // be pointed at anything except our own content/blog/*.md files.
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'Kith' },
    publisher: { '@type': 'Organization', name: 'Kith' },
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <div style={{ background: BG }}>
        <div className="max-w-2xl mx-auto px-6 py-8">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs text-purple-200/60 hover:text-white transition-colors mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Blog
          </Link>
          <KithLockup markSize={22} className="text-[15px] text-white" gradientId={`kith-post-${post.slug}`} gradientFrom="#e9d5ff" gradientTo="#a78bfa" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-6 leading-tight">{post.title}</h1>
          <p className="text-xs text-purple-200/50 mt-3">
            {new Date(post.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div
          className="prose prose-slate prose-sm sm:prose-base max-w-none prose-headings:font-bold prose-a:text-violet-600"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        <div className="mt-12 rounded-2xl border border-violet-200 bg-violet-50/50 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">Want to try Kith in your own practice?</p>
          <p className="text-xs text-muted-foreground mt-1">Free to start — no card required.</p>
          <Link href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors mt-4">
            Get started free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
