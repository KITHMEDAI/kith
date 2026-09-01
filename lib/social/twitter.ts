import { TwitterApi } from 'twitter-api-v2';

// Posting-only (OAuth 1.0a user context) — needs a Twitter/X developer app
// with "Read and Write" permissions, plus an access token/secret generated
// for the specific account Kith should post as. Same "configured() check,
// 503 if not set up" pattern as lib/razorpay.ts.
export function twitterConfigured(): boolean {
  return !!(
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_SECRET
  );
}

export function getTwitterClient(): TwitterApi {
  if (!twitterConfigured()) throw new Error('Twitter/X not configured');
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  });
}

export async function postTweet(text: string, imagePath?: string): Promise<{ id: string; url: string }> {
  const client = getTwitterClient();
  if (imagePath) {
    const mediaId = await client.v1.uploadMedia(imagePath);
    const { data } = await client.v2.tweet(text, { media: { media_ids: [mediaId] } });
    return { id: data.id, url: `https://x.com/i/web/status/${data.id}` };
  }
  const { data } = await client.v2.tweet(text);
  return { id: data.id, url: `https://x.com/i/web/status/${data.id}` };
}

export async function postReply(text: string, inReplyToTweetId: string): Promise<{ id: string; url: string }> {
  const client = getTwitterClient();
  const { data } = await client.v2.reply(text, inReplyToTweetId);
  return { id: data.id, url: `https://x.com/i/web/status/${data.id}` };
}

// Extracts the numeric tweet ID from a status URL, e.g.
// https://x.com/someone/status/1234567890 -> "1234567890"
export function tweetIdFromUrl(url: string): string | null {
  const match = url.match(/status\/(\d+)/);
  return match ? match[1] : null;
}
