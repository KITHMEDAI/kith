# Daily Outreach Research Runbook

Procedure for the scheduled daily research-and-draft pass across X and Reddit.
Self-contained — assume no memory of prior runs beyond this file, the repo,
and the two runbooks it builds on:
`docs/influencer-agent-runbook.md` (standalone X/Instagram post drafting —
ground truth feature list, voice/style rules, hard boundaries) and
`docs/x-engagement-runbook.md` (X reply drafting — voice/style rules for
replies specifically). Read both in full before starting; this file only adds
the daily research/orchestration layer on top of them.

## What this run does, in order

1. **Standalone X post.** Follow `docs/influencer-agent-runbook.md`'s
   procedure exactly — check `content/social/_history.json` for the 14-day
   topic window, pick something fresh, draft it to
   `content/social/drafts/<date>-<slug>.md`, update the history file.
   - If a real product screenshot fits the topic, take one now (see "Screenshot
     safety" below) and reference it via an `image:` frontmatter field (path
     relative to repo root, e.g. `image: content/social/assets/<file>.png`).
     Save screenshots to `content/social/assets/`. If no safe/relevant
     screenshot fits, use the branded OG card instead: fetch
     `https://www.kith.space/opengraph-image` and save it there, or omit
     `image` entirely and post text+link only — never block the post on
     having an image.

2. **Keyword search, both platforms.** Use this keyword set (pulled from the
   real feature/tech list — do not add speculative or unreleased-feature
   keywords):
   - Documentation: SOAP notes, DAP notes, progress notes, documentation time,
     note templates, clinical notes
   - AI/ambient: ambient transcription, AI scribe, AI notetaker, session
     transcription
   - Telehealth: notetaker bot, Google Meet notes, telehealth documentation,
     online therapy notes
   - Scheduling: double booking, recurring appointments, scheduling
     conflicts, no-show
   - Practice management: private practice, solo practice, caseload
     management, EHR, import patients, PDF export
   - Trust/compliance: DPDP 2023, data encryption therapist, recording
     consent, consent form therapy
   - Pricing: free EHR, free therapy notes tool, no credit card therapy
     software

   **X search** (via the logged-in browser — `mcp__claude-in-chrome__*`
   tools, `x.com/search?q=...&f=live`): expect mostly noise (confirmed over
   ~20 queries across two prior sessions — crypto "charting", course spam,
   unrelated homophones). Don't force a match; a day with zero good X reply
   candidates is a normal, expected outcome, not a failure to fix by trying
   more queries.

   **Reddit search** (no login needed for reading —
   `reddit.com/r/therapists/search/?q=<term>&restrict_sr=1&sort=new`, same
   for r/AskTherapists and r/clinicalpsych): historically much higher signal.
   Filter to threads active in the **last 7 days** (a 3-month-old thread is a
   drive-by if replied to now, not a real answer). Skip threads that are
   already visibly hostile to tool mentions (e.g. someone already got called
   out for a promotional-sounding reply in that thread).

3. **Draft candidates, don't post anything.**
   - X replies: for each genuinely relevant, fresh X thread, draft per
     `docs/x-engagement-runbook.md`'s voice rules, saved to
     `content/social/engagement/<date>-<slug>.md` with `targetUrl` +
     `targetContext` frontmatter. It's fine and expected to answer honestly
     without a Kith mention when that's the better reply — never force it.
   - Reddit angles: for each genuinely relevant, fresh Reddit thread, draft a
     genuine, helpful, non-promotional-first comment and append it to
     `content/social/reddit-ideas.md` using the existing format in that file
     (topic heading + the thread context + the angle). Include the thread
     URL. These are **never posted by the agent, on this run or any future
     one** — Reddit posting is 100% human-executed, always. This is not a
     policy detail, it's a mechanical one: a fresh/low-karma account posting
     on a schedule is exactly what gets shadowbanned, and r/therapists strips
     comments from accounts without verified professional flair. If Reddit
     login is present in the browser and you're unsure whether posting looks
     safe, the answer is always: draft it, don't post it.

## Screenshot safety (read before taking any authenticated screenshot)

The logged-in browser may auto-open Kith's own dashboard (real account, real
session data). Hard rule: **never screenshot any view that shows patient
names, session notes, transcripts, or diagnosis/note content** — even if it's
obviously test data (e.g. a patient named "Tester_1"), because a public
viewer can't tell test data from real PHI and alarming-sounding synthetic
note text (crisis language, etc.) reads as a real exposed patient note either
way. Safe to screenshot: public marketing pages (kith.space, no login), the
public `/soap-formatter` tool, or authenticated empty-state UI chrome with no
patient-specific content on screen (e.g. the session-start screen before
recording begins, a "New appointment" blank form, Settings). When in doubt,
skip the screenshot and use the branded OG card instead.

## Output — what "show me everything at once" means

Do not post anything, ever, on this run. When done, produce one clear summary
(in your final response to whoever reviews this run) covering:
- The standalone X post draft (full text, image if any, file path)
- Every X reply draft: target thread URL + the reply text
- Every new Reddit angle added: thread URL + the angle summary
- A one-line note on anything skipped and why (e.g. "no fresh X threads
  today," "skipped thread X, already flagged as ad-suspicious")

Commit and push all new/updated files under `content/social/` (draft file,
history file, engagement files, reddit-ideas.md) to `origin/main` — a draft
file has zero public effect, same reasoning as the existing influencer agent.
Never commit anything outside `content/social/`.

**Posting X items (post + replies) only happens later, in an interactive
session, after a human has actually read this run's output and said so
explicitly.** This scheduled run never runs `--confirm` on either posting
script under any circumstance.
