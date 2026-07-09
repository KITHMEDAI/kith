import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const inter = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const title = 'Kith — AI Clinical Workspace for Therapists';
const description =
  'Private clinical workspace with AI-assisted SOAP notes and real-time session transcription.';

export const metadata: Metadata = {
  metadataBase: new URL('https://kith.space'),
  title,
  description,
  openGraph: {
    title,
    description,
    url: 'https://kith.space',
    siteName: 'Kith',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
