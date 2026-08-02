/**
 * Manual, explicit posting tool for engagement replies in content/social/engagement/.
 * Defaults to a dry run — prints exactly what would be posted and does
 * nothing else. Only actually posts with --confirm. Same safety pattern as
 * scripts/post-social-draft.ts, extended to replies (needs a target tweet ID,
 * not just fresh-tweet text).
 *
 * Usage:
 *   npx tsx scripts/post-social-reply.ts content/social/engagement/<file>.md            (dry run)
 *   npx tsx scripts/post-social-reply.ts content/social/engagement/<file>.md --confirm   (posts for real)
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import matter from 'gray-matter';
import { twitterConfigured, postReply, tweetIdFromUrl } from '../lib/social/twitter';

async function main() {
  const filePath = process.argv[2];
  const confirm = process.argv.includes('--confirm');

  if (!filePath) {
    console.error('Usage: npx tsx scripts/post-social-reply.ts <engagement-file> [--confirm]');
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  if (data.status === 'posted') {
    console.error(`This reply is already marked "posted" (${filePath}). Nothing to do.`);
    process.exit(1);
  }

  if (!data.targetUrl) {
    console.error('Missing "targetUrl" in frontmatter — this file needs the URL of the tweet being replied to.');
    process.exit(1);
  }

  const tweetId = tweetIdFromUrl(data.targetUrl);
  if (!tweetId) {
    console.error(`Could not extract a tweet ID from targetUrl: ${data.targetUrl}`);
    process.exit(1);
  }

  const replyMatch = content.match(/## Reply\n\n([\s\S]*?)(\n\n## |$)/);
  if (!replyMatch) {
    console.error('No "## Reply" section found in this draft.');
    process.exit(1);
  }
  const replyText = replyMatch[1].trim();

  console.log(`--- Would reply to ${data.targetUrl} ---`);
  console.log(replyText);
  console.log(`--- (${replyText.length} characters) ---\n`);

  if (!confirm) {
    console.log('Dry run only — nothing was posted. Re-run with --confirm to actually post.');
    return;
  }

  if (!twitterConfigured()) {
    console.error('Twitter/X is not configured (missing TWITTER_API_KEY/SECRET/ACCESS_TOKEN/ACCESS_SECRET env vars). Nothing was posted.');
    process.exit(1);
  }

  const result = await postReply(replyText, tweetId);
  console.log(`Posted: ${result.url}`);

  const updated = matter.stringify(content, { ...data, status: 'posted', posted_at: new Date().toISOString(), reply_url: result.url });
  fs.writeFileSync(filePath, updated);
  console.log(`Updated ${filePath} — status: posted`);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
