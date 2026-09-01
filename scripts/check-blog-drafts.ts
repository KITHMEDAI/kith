/**
 * Guard against the content/blog/_queue.json status and each post's
 * `draft` frontmatter flag drifting apart — the exact gap that let
 * reduce-no-shows-scheduling.md go live on kith.space without review
 * (queue said "drafted", the file never had draft: true).
 *
 * Exits non-zero (and prints every mismatch) if:
 *   - the queue says a post isn't "published" yet, but the file has no
 *     draft: true — it is actually LIVE right now, unreviewed.
 *   - the queue says a post IS "published", but the file still has
 *     draft: true — it's actually hidden despite being marked live.
 *
 * Usage: npx tsx scripts/check-blog-drafts.ts
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(__dirname, '..', 'content', 'blog');
const QUEUE_PATH = path.join(BLOG_DIR, '_queue.json');

function main() {
  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'));
  const queueBySlug = new Map<string, string>(
    queue.items.map((item: { slug: string; status: string }) => [item.slug, item.status])
  );

  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const { data } = matter(fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8'));
    const isHidden = !!data.draft;
    const queueStatus = queueBySlug.get(slug);

    if (queueStatus === undefined) {
      warnings.push(`"${slug}" has no entry in _queue.json — add one so its status can be tracked.`);
      continue;
    }

    if (queueStatus === 'published' && isHidden) {
      errors.push(`"${slug}": queue says "published" but the file has draft: true — it is hidden even though the queue claims it's live.`);
    }
    if (queueStatus !== 'published' && !isHidden) {
      errors.push(`"${slug}": queue says "${queueStatus}" (not published) but the file has NO draft: true — it is LIVE on kith.space right now, unreviewed.`);
    }
  }

  for (const w of warnings) console.warn(`[warn] ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`[error] ${e}`);
    console.error(`\n${errors.length} mismatch(es) between _queue.json and post frontmatter. Fix before committing/pushing.`);
    process.exit(1);
  }

  console.log(`OK — ${files.length} post(s) checked, queue and draft flags agree.`);
}

main();
