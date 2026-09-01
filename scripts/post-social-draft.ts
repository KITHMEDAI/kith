/**
 * Manual, explicit posting tool for drafts in content/social/drafts/.
 * Defaults to a dry run — prints exactly what would be posted and does
 * nothing else. Only actually posts with --confirm, and only to Twitter/X
 * (the only platform with a real posting integration — see
 * docs/influencer-agent-runbook.md for why Instagram/Reddit aren't here).
 *
 * Usage:
 *   npx tsx scripts/post-social-draft.ts content/social/drafts/<file>.md            (dry run)
 *   npx tsx scripts/post-social-draft.ts content/social/drafts/<file>.md --confirm   (posts for real)
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
// This script runs standalone via `npx tsx`, not through Next.js's dev/build
// process — Next.js auto-loads .env.local for the app itself, but a bare
// script needs to load it explicitly or every env var reads as undefined.
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import matter from 'gray-matter';
import { twitterConfigured, postTweet } from '../lib/social/twitter';

async function main() {
  const filePath = process.argv[2];
  const confirm = process.argv.includes('--confirm');

  if (!filePath) {
    console.error('Usage: npx tsx scripts/post-social-draft.ts <draft-file> [--confirm]');
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  if (data.status === 'posted') {
    console.error(`This draft is already marked "posted" (${filePath}). Nothing to do.`);
    process.exit(1);
  }

  const twitterMatch = content.match(/## Twitter\/X\n\n([\s\S]*?)(\n\n## |$)/);
  if (!twitterMatch) {
    console.error('No "## Twitter/X" section found in this draft.');
    process.exit(1);
  }
  const tweetText = twitterMatch[1].trim();

  // Optional `image` frontmatter field — path relative to the repo root.
  const imagePath = data.image ? path.join(__dirname, '..', data.image) : undefined;
  if (imagePath && !fs.existsSync(imagePath)) {
    console.error(`Frontmatter "image: ${data.image}" doesn't exist at ${imagePath}.`);
    process.exit(1);
  }

  console.log('--- Would post to Twitter/X ---');
  console.log(tweetText);
  console.log(`--- (${tweetText.length} characters)${imagePath ? ` + image: ${data.image}` : ''} ---\n`);

  if (!confirm) {
    console.log('Dry run only — nothing was posted. Re-run with --confirm to actually post.');
    return;
  }

  if (!twitterConfigured()) {
    console.error('Twitter/X is not configured (missing TWITTER_API_KEY/SECRET/ACCESS_TOKEN/ACCESS_SECRET env vars). Nothing was posted.');
    process.exit(1);
  }

  const result = await postTweet(tweetText, imagePath);
  console.log(`Posted: ${result.url}`);

  const updated = matter.stringify(content, { ...data, status: 'posted', posted_at: new Date().toISOString(), tweet_url: result.url });
  fs.writeFileSync(filePath, updated);
  console.log(`Updated ${filePath} — status: posted`);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
