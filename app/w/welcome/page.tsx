import type { Metadata } from 'next';
import { HomeLanding } from '@/components/workspace/Landing';
import { WS_TITLE, WS_DESCRIPTION, HOME_FAQ, softwareLd, faqLd, ldJson, socialMeta } from '@/lib/workspace/site';

// Shown at "/" to logged-out visitors (middleware rewrites / → /w/welcome).
export const metadata: Metadata = {
  title: { absolute: WS_TITLE },
  description: WS_DESCRIPTION,
  alternates: { canonical: '/' },
  ...socialMeta(WS_TITLE, WS_DESCRIPTION, '/'),
  robots: { index: true, follow: true },
};

export default function WelcomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson([softwareLd(), faqLd(HOME_FAQ)]) }} />
      <HomeLanding />
    </>
  );
}
