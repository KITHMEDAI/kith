import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { WS_URL, WS_NAME, WS_TITLE, WS_DESCRIPTION, socialMeta, organizationLd as wsOrganizationLd, websiteLd as wsWebsiteLd, ldJson } from '@/lib/workspace/site';

const inter = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kith.space';
const title = 'Kith — AI Clinical Workspace for Therapists';
const description =
  'Private clinical workspace with AI-assisted SOAP notes and real-time session transcription.';

const IS_WORKSPACE = process.env.NEXT_PUBLIC_EDITION === 'workspace';

// Workspace edition (work.kith.space): its own name, base URL and previews.
// Each public page sets its own canonical; app pages are noindex (app/w/layout.tsx).
const workspaceMetadata: Metadata = {
  metadataBase: new URL(WS_URL),
  title: WS_TITLE,
  description: WS_DESCRIPTION,
  applicationName: WS_NAME,
  ...socialMeta(WS_TITLE, WS_DESCRIPTION, '/'),
  verification: { google: '8-9pOJnPvbZguHKYVW3we5387WAsHGuml-9-Rzu_TT0' },
};

const therapistMetadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title,
  description,
  alternates: { canonical: BASE_URL },
  openGraph: {
    title,
    description,
    url: BASE_URL,
    siteName: 'Kith',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  verification: {
    google: '8-9pOJnPvbZguHKYVW3we5387WAsHGuml-9-Rzu_TT0',
  },
};

export const metadata: Metadata = IS_WORKSPACE ? workspaceMetadata : therapistMetadata;

// Site-wide identity signal for Google (knowledge panel / brand search
// eligibility) — harmless to render on authenticated pages too, since those
// are already disallowed in robots.ts and never crawled.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Kith',
  url: BASE_URL,
  logo: `${BASE_URL}/icon.svg`,
  description,
};

// Deliberately no `potentialAction: SearchAction` here — that requires an
// actual on-site search page (e.g. /search?q={term}), which Kith doesn't
// have. Adding it anyway would be schema for a feature that doesn't exist.
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Kith',
  url: BASE_URL,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={IS_WORKSPACE ? 'en-AU' : 'en'} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: IS_WORKSPACE ? ldJson(wsOrganizationLd()) : JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: IS_WORKSPACE ? ldJson(wsWebsiteLd()) : JSON.stringify(websiteJsonLd) }} />
        {children}
        {/* No analytics in the Workspace edition (privacy: notes app). */}
        {process.env.NEXT_PUBLIC_EDITION !== 'workspace' && <Analytics />}
      </body>
    </html>
  );
}
