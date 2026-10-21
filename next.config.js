/** @type {import('next').NextConfig} */
const nextConfig = {
  // The workspace edition's local dev server builds into its own folder so it
  // can run alongside the therapist dev server without corrupting .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Required on Next.js 14.x for instrumentation.ts's register() (Sentry.init)
  // to actually run — without this, the hook is silently never called and
  // Sentry never sees a single event, regardless of SENTRY_DSN being set.
  experimental: {
    instrumentationHook: true,
  },
  poweredByHeader: false,
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
