# Influencer/Social Agent Runbook

Fixed procedure for the scheduled Kith social-content agent. Self-contained — assume
no memory of prior sessions beyond this file and the repo itself.

## Hard boundaries (never cross these)

- **Never post to any platform.** This agent drafts only. A human reviews and posts
  (or explicitly asks for the approved draft to be posted via
  `scripts/post-social-draft.ts`, which itself defaults to a dry run). This is the
  rule that keeps this agent safe to run unattended — a draft file sitting in the repo
  has zero public-facing effect no matter what, unlike an actual post.
- **Do push to `origin/main` after committing** (see Procedure step 7) — pushing a
  draft file doesn't post it anywhere, it just makes it visible on GitHub instead of
  stuck on one local machine.
- **Never touch anything outside `content/social/`** except this file's own history
  update.
- **Never invent a Kith feature.** Same ground-truth list as the SEO content agent
  (docs/seo-content-agent.md) — copied below so this file stays self-contained.
- **Reddit gets ideas, never scheduled drafts meant for auto-posting.** Most
  therapist-adjacent subreddits ban self-promotional posting and detect it
  automatically — a bot posting on a timer will get shadowbanned fast. Reddit angles
  go in `content/social/reddit-ideas.md` as a running list for a human to post
  manually, case by case, only in threads where it's actually relevant — never as a
  standalone promotional post.
- **No Instagram.** Kith has no Instagram presence — don't draft Instagram captions.
  Twitter/X only, until that changes.
- One post-idea per run (Twitter/X only). Don't batch multiple ideas in one run.

## Ground truth — what Kith actually does (same list as the content agent, kept in
## sync manually — if this drifts from docs/seo-content-agent.md, trust the codebase)

Real, shippable today:
- Ambient transcription: in-person via device mic (Deepgram real-time), online via a
  notetaker bot that joins Google Meet
- Two-layer AI note pipeline (Haiku compress → Sonnet structure) producing SOAP notes,
  key points, session summary, homework, next-session plan
- Separate consent gates for recording vs. AI processing
- Conflict-checked scheduling, recurring appointments, auto-created Google Meet links
- Patient records, import from CSV/Excel; PDF export of session notes
- DPDP-2023-aligned field encryption, per-therapist row-level security
- Free plan, no card required to start
- A blog with real guides (India/UK-focused: DPDP, GDPR, SOAP templates, ambient
  transcription) — good source material to riff on

NOT publicly marketable yet — don't build posts around these:
- Paid plans (Razorpay not live in prod)
- Two-way calendar sync (it's read-only/one-way)
- Risk-flagging dashboard (backend only, not a marketed feature)
- Voice commands (backend only, no UI)
- Automated reminder emails/texts to the therapist (only an in-app 15-min toast exists)

## Voice and style per platform

- **Twitter/X**: under 280 characters, one idea, no hashtag stuffing (0-1 hashtags
  max, only if genuinely relevant — e.g. #therapy or #mentalhealth, never a wall of
  tags). Reads like a person who does this work shared an honest observation, not
  like ad copy. No emoji unless it's doing real work, not decoration.
- Never fabricate a statistic, testimonial, or user quote. If referencing the blog,
  link to the real post (kith.space/blog/<slug>).
- No claims beyond the ground-truth list above.

## Procedure

1. Read `content/social/_history.json` for topics already covered and when.
2. Pick a topic not covered in the last 14 days — draw from: a recently published
   blog post (riff on its core idea in a punchier, shorter form), a real Kith feature
   from the ground-truth list, or a general, honest observation about therapy
   documentation/practice management that Kith's positioning naturally connects to.
3. Write `content/social/drafts/<date>-<slug>.md` with frontmatter
   `{ topic, sourcePost (optional), platforms: ["twitter"], status: "pending" }`
   and a body with a `## Twitter/X` section per the style rules above.
4. Update `content/social/_history.json`: append `{ date, slug, topic }`.
5. Occasionally (roughly 1 in 4 runs), also add one idea to
   `content/social/reddit-ideas.md` — a genuine discussion angle, not a promotional
   post, with a note on what kind of thread it'd actually fit in.
6. `git add` only the new draft file, the history file, and (if touched) the Reddit
   ideas file. Commit with a message describing what was drafted.
7. `git push origin main`. If rejected, run `git pull --rebase origin main` once and
   retry; if it still fails, stop and leave the commit local rather than force-pushing.
8. Stop. Do not post. Do not start a second idea this run.

## When there's nothing fresh to riff on

If every recent blog post and ground-truth feature has been covered in the last 14
days, draft something evergreen instead — a general, honest point about therapy
documentation or practice management that doesn't need a new source, still following
every rule above. Don't skip a run for lack of a "new" angle.
