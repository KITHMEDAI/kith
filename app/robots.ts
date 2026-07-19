import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kith.space';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/blog'],
      disallow: ['/dashboard', '/api', '/settings', '/patients', '/session', '/notes', '/appointments', '/insights', '/onboarding'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
