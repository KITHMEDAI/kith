/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required on Next.js 14.x for instrumentation.ts's register() (Sentry.init)
  // to actually run — without this, the hook is silently never called and
  // Sentry never sees a single event, regardless of SENTRY_DSN being set.
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
