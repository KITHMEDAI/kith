/** @type {import('next').NextConfig} */
const IS_WORKSPACE = process.env.NEXT_PUBLIC_EDITION === 'workspace';
const isDev = process.env.NODE_ENV !== 'production';

// Kith Workspace security headers (audit 2026-10-22). Workspace edition only,
// so the kith.space therapist app (Razorpay, Google, Sentry…) is unaffected.
function workspaceHeaders() {
  const supabase = (() => {
    try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').host; } catch { return '*.supabase.co'; }
  })();
  const csp = [
    "default-src 'self'",
    // Next.js inline bootstrap scripts; blob: for the recorder's AudioWorklet;
    // Cloudflare Turnstile (CAPTCHA) on the sign-in page.
    `script-src 'self' 'unsafe-inline' blob: https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    `connect-src 'self' https://${supabase} wss://${supabase} https://api.deepgram.com wss://api.deepgram.com${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
  return [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'microphone=(self), display-capture=(self), camera=(), geolocation=(), payment=(), usb=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  ];
}

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
    // The workspace never loads remote images.
    remotePatterns: IS_WORKSPACE ? [] : [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async headers() {
    return IS_WORKSPACE ? [{ source: '/:path*', headers: workspaceHeaders() }] : [];
  },
};

module.exports = nextConfig;
