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

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  keyword?: string;
}

export interface BlogPost extends BlogPostMeta {
  html: string;
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
    html: marked.parse(content, { async: false }) as string,
  };
}

export function getAllPosts(): BlogPostMeta[] {
  return readSlugs()
    .map(readPost)
    .filter((p): p is BlogPost => p !== null)
    .map(({ slug, title, description, date, keyword }) => ({ slug, title, description, date, keyword }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  return readPost(slug);
}
