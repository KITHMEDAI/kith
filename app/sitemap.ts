import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kith.space';

// Last-editorial-change dates for pages with no dynamic content, taken from
// git history at the time this was added. Bump the relevant one whenever
// that page's copy actually changes — these were previously omitted
// entirely, which left 5 sitemap entries with no lastmod at all.
const SOAP_FORMATTER_LAST_MODIFIED = '2026-08-06';
const PRIVACY_LAST_MODIFIED = '2026-08-16';
const TERMS_LAST_MODIFIED = '2026-08-06';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  // Homepage and the blog index both surface the latest post, so their
  // "last changed" date tracks the newest published post's date.
  const latestPostDate = posts[0]?.date;

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: latestPostDate, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/blog`, lastModified: latestPostDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/soap-formatter`, lastModified: SOAP_FORMATTER_LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/privacy`, lastModified: PRIVACY_LAST_MODIFIED, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: TERMS_LAST_MODIFIED, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const postPages: MetadataRoute.Sitemap = posts.map(post => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticPages, ...postPages];
}
