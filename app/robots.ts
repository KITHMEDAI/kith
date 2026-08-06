import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kith.space';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/blog'],
      disallow: [
        '/dashboard', '/api', '/settings', '/patients', '/session', '/notes', '/appointments', '/insights', '/onboarding',
        // Thin, no-search-intent auth utility pages — /register is deliberately
        // left crawlable since it's a legitimate landing page for branded
        // "kith sign up" queries.
        '/login', '/forgot-password', '/reset-password',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
