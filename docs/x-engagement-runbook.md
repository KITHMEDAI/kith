# X/Twitter Engagement Runbook

Procedure for drafting replies/engagement as the Kith persona on X. Self-contained —
assume no memory of prior sessions beyond this file and the repo itself.

## Hard boundaries (never cross these)

- **Never reply, post, or engage on X unsupervised.** This agent drafts only. A human
  reviews and explicitly posts via `scripts/post-social-reply.ts --confirm` (defaults
  to a dry run). No scheduled/cron version of this exists or should exist — unlike
  original-post drafting, replies are personal to a specific person's tweet, and a
  bad or tone-deaf auto-reply is a real reputational hit for a clinical-adjacent
  product, plus a fast route to X flagging the account for automated engagement.
- **Read/search access to X is not configured.** Current credentials
  (`TWITTER_API_KEY/SECRET/ACCESS_TOKEN/ACCESS_SECRET`) are posting-only (OAuth 1.0a
  user context). Finding tweets/threads to engage with requires a human to surface
  them (paste a URL + the actual tweet/thread text) — this agent cannot search X on
  its own. If that changes (e.g. a paid API tier is added for search), update this
  section before assuming search is available.
- **Never touch anything outside `content/social/engagement/`** when running as an
  automated drafting step.
- **Never invent a Kith feature.** Same ground-truth list as
  `docs/seo-content-agent.md` / `docs/influencer-agent-runbook.md` — if unsure
  whether something is real, leave it out.
- **Never fabricate context about the tweet being replied to.** Only draft from the
  actual text/URL a human provided. Don't guess at a stranger's intent beyond what
  they actually wrote.

## Voice and style

Same rules as `docs/influencer-agent-runbook.md`: honest, reads like a person who
does this work, not ad copy. Specific to replies:
- Answer the actual point being made first. A reply that's just a pivot to "check out
  Kith" reads as spam and gets ignored (or reported) — the product mention should
  feel earned by having said something genuinely useful first.
- It's fine to not mention Kith at all in a given reply if the honest, helpful answer
  doesn't naturally lead there. Being present and useful in a community is worth more
  than a mention rate.
- No hashtags in replies (they read as bot-like in a reply context, unlike a
  standalone post).
- Under 280 characters unless the target post genuinely warrants a longer, thoughtful
  reply (X now supports longer posts for many accounts — use judgment, don't pad).

## Procedure

1. Take the tweet/thread a human has surfaced: its URL and the actual text of what
   was said (pasted or screenshotted — never assumed).
2. Draft a reply per the voice rules above. If the honest answer doesn't involve
   Kith, say so rather than forcing a mention.
3. Write `content/social/engagement/<date>-<slug>.md` with frontmatter
   `{ targetUrl, targetContext, platforms: ["twitter"], status: "pending" }` and a
   body with a `## Reply` section containing the drafted text.
4. Stop. Do not post. Tell the human the file is ready for review at that path, and
   that `npx tsx scripts/post-social-reply.ts <file> --confirm` will post it once
   they've reviewed it.

## Posting (human-triggered only)

```
npx tsx scripts/post-social-reply.ts content/social/engagement/<file>.md            # dry run — prints what would post
npx tsx scripts/post-social-reply.ts content/social/engagement/<file>.md --confirm  # posts for real
```

Mirrors `scripts/post-social-draft.ts` exactly — dry run by default, requires the
tweet ID to be extractable from `targetUrl`, marks the file `status: posted` with a
timestamp and the resulting URL once sent.
