# SEO/Content Agent Runbook

This is the fixed procedure for the scheduled Kith content agent. It's written to be
self-contained — the agent invocation may start cold with no memory of prior sessions,
so don't assume anything beyond what's in this file and the repo itself.

## Hard boundaries (never cross these)

- **Never remove `draft: true`** from a post, and never add a post without it.
- **Never run `git push`.** Commit locally only. A human reviews and pushes.
- **Never touch anything outside `content/blog/`** except this file's own queue update.
- **Never invent a Kith feature.** Only describe what's in the "ground truth" section
  below. If you're unsure whether something is real, leave it out rather than guess.
- **Never state a competitor's pricing/features from memory alone.** If the queue item
  has `"researchNeeded": true`, you must live-verify via WebSearch/WebFetch before
  writing anything specific about that competitor. Cite what you actually found; if you
  can't verify something, don't claim it.
- One post per run. Don't batch-draft the whole queue in one sitting — quality drops
  and it removes the point of a steady cadence.

## Ground truth — what Kith actually does (do not claim beyond this)

Real, shippable today:
- Ambient transcription: in-person via device mic (Deepgram real-time), online via a
  notetaker bot that joins Google Meet
- Two-layer AI note pipeline (Haiku compress → Sonnet structure) producing SOAP notes,
  key points, session summary, homework, next-session plan
- Separate consent gates for recording vs. AI processing (both required, tracked
  server-side)
- Conflict-checked scheduling, recurring appointments, auto-created Google Meet links
- Patient records, import from CSV/Excel
- PDF export of session notes
- DPDP-2023-aligned field encryption, per-therapist row-level security (RLS)
- Free plan, no card required to start

Real but NOT publicly marketable yet (don't build content around these):
- Paid plans (Pro/Ultra) — Razorpay isn't live in production; checkout would fail for
  a real visitor. Don't push "upgrade to Pro" messaging.
- Two-way calendar sync — it's read-only/one-way (pulls from Google Calendar in, never
  writes back except creating the Meet event itself for a booking made in Kith).
- Any risk-flagging / clinical risk dashboard — this exists in the backend but is
  intentionally not surfaced as a marketed feature.
- Voice commands — backend exists, no UI, don't mention it.
- Email/SMS session reminders to the therapist — only an in-app 15-minute toast exists;
  don't claim automated reminder emails/texts to practitioners.

If a future run of this agent finds the live app has changed (new features shipped,
old ones removed), trust what's actually in the codebase over this list — but don't
assume a feature exists without checking `app/` or asking.

## Target audience & goals

Independent therapists and small practices (1–5 practitioners), primarily India and
UK, secondary wider Europe. Goal: organic traffic from people evaluating AI clinical
documentation / practice-management tools, converting to a free Kith signup.

## Style conventions (match the existing 3 posts)

- Genuinely useful and honest — reads like a knowledgeable peer, not ad copy. Include
  real limitations, not just benefits.
- No fabricated statistics or study citations. If you don't have a verifiable number,
  don't invent one.
- 1000–2000 words depending on `priority` (quick-win: ~1200, big-bet: ~1800-2200).
- Frontmatter: `title`, `description` (under 160 chars, used as meta description),
  `date` (next available date, roughly 1 week after the last post's date — check
  existing files in `content/blog/` for the most recent date), `keyword`, `draft: true`.
- Compliance/legal topics (data protection law, regulatory claims) get an upfront
  italicized disclaimer, same pattern as `dpdp-2023-therapist-notes.md`.
- Comparison posts must be fair — acknowledge where a competitor is genuinely
  stronger, not just where Kith wins. A comparison post that reads as pure marketing
  will backfire in search and in trust.

## Procedure

1. Read `content/blog/_queue.json`. Pick the highest-priority `"status": "pending"`
   item (priority order: quick-win → fill-in → big-bet, unless a big-bet has been
   pending for 3+ runs, in which case prioritize it to avoid the queue stalling on
   only the hard items).
2. If `"researchNeeded": true`, research the named competitor(s) live — actual
   current pricing tier names, core features, and target market. Note explicitly in
   your own working notes what you verified vs. couldn't find, and only write claims
   you can support.
3. Check the most recent post's `date` frontmatter in `content/blog/` to pick the next
   sequential date (~1 week later).
4. Write the post to `content/blog/<slug>.md` per the style conventions above.
   `<slug>` must match the `slug` field already reserved in the queue.
5. Run the SEO self-check below. Fix anything that fails before proceeding.
6. Update `content/blog/_queue.json`: set this item's `"status"` to `"drafted"`.
7. Run `npx tsc --noEmit` to confirm nothing broke (should be a no-op for a markdown
   file, but confirms the queue JSON is still valid and nothing else was touched).
8. `git add` only the new post file and the queue file. Commit with a message
   describing what was drafted and, for research-backed posts, what was verified.
9. Stop. Do not push. Do not flip draft off. Do not start a second post this run.

## SEO self-check (run before committing)

- [ ] Title (frontmatter `title`) is under ~60 characters, includes the target keyword
      naturally
- [ ] `description` is under 160 characters, includes the target keyword, reads as a
      real sentence (not keyword-stuffed)
- [ ] Exactly one H1 equivalent (the post title, rendered by the page template — don't
      add a duplicate `# Title` inside the body)
- [ ] Body uses `##` (H2) for main sections, in a logical order, not skipping to `###`
      without an H2 parent
- [ ] Target keyword or a close natural variant appears in at least one H2 and in the
      first paragraph — without sounding forced
- [ ] No fabricated statistics, no invented Kith features (cross-check against ground
      truth above), no unverified competitor claims
- [ ] At least one internal link opportunity considered — if an earlier published post
      covers a related subtopic, link to it naturally in the body
- [ ] Word count matches the priority-tier target above

## When the queue runs dry

If every item in `content/blog/_queue.json` is `"status": "drafted"` or `"published"`,
don't stop entirely — do one round of lightweight keyword research (WebSearch) within
the three established pillars (AI Clinical Documentation, Running a Private Practice,
Clinical Documentation Best Practice — see the original content strategy discussion),
propose 3–5 new queue items with the same schema, add them to `_queue.json` with
`"status": "pending"`, then stop for this run (draft from the new queue next run, not
the same run — keeps each run's diff reviewable).
