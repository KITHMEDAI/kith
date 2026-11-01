/**
 * lib/workspace/site.ts
 *
 * Public identity of Kith Workspace (work.kith.space) for search engines and
 * link previews: canonical base URL, names, descriptions and the structured
 * data (schema.org JSON-LD) shared by the public pages. Claims here must match
 * the Privacy page and the product (free during early access, notes stored in
 * Sydney, AI in the US, recordings deleted after transcription).
 */
import { USE_CASES, type UseCase } from './use-cases';

export const WS_URL = (process.env.NEXT_PUBLIC_WORKSPACE_URL || 'https://work.kith.space').replace(/\/+$/, '');
export const WS_NAME = 'Kith Workspace';
export const WS_TITLE = 'AI Note Taker for Shift Notes, Care Notes & Site Reports | Kith Workspace';
export const WS_DESCRIPTION =
  'Speak for two minutes, get the note. Kith Workspace turns voice notes, recorded meetings and rough notes into NDIS progress notes, aged care notes, incident reports, site diaries, handovers and meeting minutes. Built in Australia. Free during early access.';

/** Last real copy change per public page (bump when the page text changes). */
export const WS_PAGES_UPDATED = {
  home: '2026-11-01',
  useCases: '2026-11-01',
  help: '2026-10-25',
  privacy: '2026-10-25',
  terms: '2026-10-25',
};

export const absolute = (path: string) => `${WS_URL}${path === '/' ? '' : path}`;

const OG_IMAGE = { url: `${WS_URL}/opengraph-image`, width: 1200, height: 630, alt: 'Kith Workspace: talk for two minutes, get the note' };

/**
 * Full Open Graph + Twitter metadata for a public page. Next replaces (doesn't
 * merge) a parent's openGraph when a page sets one, so every page passes the
 * site name, locale and image again here.
 */
export function socialMeta(title: string, description: string, path: string) {
  return {
    openGraph: { title, description, url: absolute(path), siteName: WS_NAME, locale: 'en_AU', type: 'website' as const, images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image' as const, title, description, images: [OG_IMAGE.url] },
  };
}

export interface Faq { q: string; a: string }

/** Questions shown on the home page (visible on the page and in FAQPage data). */
export const HOME_FAQ: Faq[] = [
  {
    q: 'What is Kith Workspace?',
    a: 'An AI note taker for people whose work happens away from a desk. Record a quick voice note after a shift, visit or site walk, record a meeting, or paste rough notes, and Kith writes a structured note in your industry’s format: NDIS progress notes, aged care notes, incident reports, site diaries, shift handovers and meeting minutes.',
  },
  {
    q: 'Does the AI make things up?',
    a: 'Kith is built to write only what you said. It does not invent goals, times, names or advice, keeps uncertain things marked as uncertain, and lists what is missing so you can fill it in. You check and edit every note before you use it.',
  },
  {
    q: 'Where is my data stored?',
    a: 'Notes and accounts are stored in Australia (Sydney) and every note is encrypted before it is stored. Recordings are deleted right after transcription. Transcription and AI writing currently run in the US with model training switched off. The Privacy page has the full details.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. Kith works in the browser on your phone, tablet or computer. You can record in the room, record an online meeting (Teams, Meet or Zoom in your browser), or type.',
  },
  {
    q: 'How much does it cost?',
    a: 'Kith Workspace is free during early access. No card is needed to sign up.',
  },
  {
    q: 'Does it understand Australian accents and local words?',
    a: 'Yes. It was tested with Australian voices in quiet and noisy rooms, and it knows common Australian words, services and medicine brands. You can add your own clients’, places’ and colleagues’ names in your profile so they are spelled right.',
  },
];

const ORG_ID = `${WS_URL}/#organization`;
const APP_ID = `${WS_URL}/#software`;

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'Kith',
    url: WS_URL,
    logo: `${WS_URL}/icon.svg`,
    email: 'kithmedai@gmail.com',
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${WS_URL}/#website`,
    name: WS_NAME,
    url: WS_URL,
    inLanguage: 'en-AU',
    publisher: { '@id': ORG_ID },
  };
}

export function softwareLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': APP_ID,
    name: WS_NAME,
    url: WS_URL,
    description: WS_DESCRIPTION,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'AI note taker',
    operatingSystem: 'Web browser (iOS, Android, Windows, macOS)',
    inLanguage: 'en-AU',
    areaServed: { '@type': 'Country', name: 'Australia' },
    featureList: [
      'Voice to structured notes',
      'NDIS shift and progress notes',
      'Incident reports with an NDIS reportable-incident and SIRS check',
      'Aged care and home care notes',
      'Construction site inspections, site diaries and defect lists',
      'Shift handovers and food-safety logs',
      'Meeting minutes with decisions and action items',
    ],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD', description: 'Free during early access' },
    publisher: { '@id': ORG_ID },
  };
}

export function faqLd(faq: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function useCaseLd(u: UseCase) {
  const url = absolute(`/for/${u.slug}`);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: u.seoTitle,
      description: u.seoDescription,
      inLanguage: 'en-AU',
      isPartOf: { '@id': `${WS_URL}/#website` },
      about: { '@id': APP_ID },
      dateModified: WS_PAGES_UPDATED.useCases,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: WS_NAME, item: WS_URL },
        { '@type': 'ListItem', position: 2, name: u.name, item: url },
      ],
    },
    faqLd(u.faq),
  ];
}

export const PUBLIC_USE_CASE_PATHS = USE_CASES.map(u => `/for/${u.slug}`);

/** Renders JSON-LD safely (no "</script>" break-out from content). */
export function ldJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
