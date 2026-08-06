import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

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

export const metadata: Metadata = {
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
};

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        {children}
      </body>
    </html>
  );
}
