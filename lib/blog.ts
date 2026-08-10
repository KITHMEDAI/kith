import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

// Posts live as markdown files in content/blog/<slug>.md with frontmatter:
//   title, description, date (YYYY-MM-DD), keyword (optional, tracking only)
// New posts should be authored with `draft: true` until reviewed — draft
// posts are excluded from the index, sitemap, and direct access (404s),
// so nothing goes live without someone flipping that flag first.
const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

// The three content pillars from the original content strategy (see
// docs/seo-content-agent.md). Used only to group posts for the "related
// posts" block — not enforced, so an unset/unrecognized category just
// falls through to the recency-based fallback in getRelatedPosts().
export const BLOG_CATEGORIES = [
  'AI Clinical Documentation',
  'Running a Private Practice',
  'Clinical Documentation Best Practice',
] as const;

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  keyword?: string;
  category?: string;
  /** Source key into lib/lead-magnets.ts — if set, the post page shows a
   *  LeadCaptureForm instead of the generic "try Kith" CTA. */
  leadMagnet?: string;
  leadMagnetLabel?: string;
}

export interface BlogFaq {
  question: string;
  answer: string;
}

export interface BlogPost extends BlogPostMeta {
  html: string;
  /** Parsed from a "## Frequently asked questions" section, if the post has one —
   *  used to emit FAQPage JSON-LD. Empty when the post has no such section. */
  faqs: BlogFaq[];
}

// Pulls Q/A pairs out of a "## Frequently asked questions" section, written as
// **Question?**\nAnswer text. Runs on the raw markdown (not the rendered HTML)
// since bold-line-then-paragraph is easy to match reliably there.
function extractFaqs(content: string): BlogFaq[] {
  const heading = content.match(/^##\s+frequently asked questions\s*$/im);
  if (!heading) return [];

  const afterHeading = content.slice(heading.index! + heading[0].length);
  const nextHeadingIdx = afterHeading.search(/^##\s/m);
  const section = nextHeadingIdx === -1 ? afterHeading : afterHeading.slice(0, nextHeadingIdx);

  const faqs: BlogFaq[] = [];
  const pairPattern = /\*\*(.+?)\*\*\s*\n([^\n]+(?:\n(?!\*\*)[^\n]+)*)/g;
  let match: RegExpExecArray | null;
  while ((match = pairPattern.exec(section)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim().replace(/\s+/g, ' ');
    if (question && answer) faqs.push({ question, answer });
  }
  return faqs;
}

function readSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));
}

function readPost(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  if (data.draft) return null;

  if (!data.title || !data.description || !data.date) {
    console.warn(`[Kith] blog post "${slug}" is missing required frontmatter (title/description/date) — skipped`);
    return null;
  }

  // Soft SEO nudges — doesn't block the post, just surfaces at build/dev time in
  // case the agent's own self-check (docs/seo-content-agent.md) missed it.
  if (data.title.length > 65) {
    console.warn(`[Kith] blog post "${slug}": title is ${data.title.length} chars, over the ~60 char guideline`);
  }
  if (data.description.length > 160) {
    console.warn(`[Kith] blog post "${slug}": description is ${data.description.length} chars, over the ~160 char guideline`);
  }

  return {
    slug,
    title: data.title,
    description: data.description,
    date: data.date,
    keyword: data.keyword,
    category: data.category,
    leadMagnet: data.leadMagnet,
    leadMagnetLabel: data.leadMagnetLabel,
    html: marked.parse(content, { async: false }) as string,
    faqs: extractFaqs(content),
  };
}

export function getAllPosts(): BlogPostMeta[] {
  return readSlugs()
    .map(readPost)
    .filter((p): p is BlogPost => p !== null)
    .map(({ slug, title, description, date, keyword, category, leadMagnet, leadMagnetLabel }) => ({ slug, title, description, date, keyword, category, leadMagnet, leadMagnetLabel }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  return readPost(slug);
}

// Related posts for internal linking: same category first (most recent
// first, since getAllPosts() is already date-sorted), then backfilled with
// the most recent other posts if the category doesn't have enough entries.
export function getRelatedPosts(current: Pick<BlogPostMeta, 'slug' | 'category'>, limit = 3): BlogPostMeta[] {
  const others = getAllPosts().filter(p => p.slug !== current.slug);
  const sameCategory = others.filter(p => current.category && p.category === current.category);
  const rest = others.filter(p => !(current.category && p.category === current.category));
  return [...sameCategory, ...rest].slice(0, limit);
}
