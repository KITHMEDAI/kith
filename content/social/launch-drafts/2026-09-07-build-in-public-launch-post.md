---
topic: >-
  build-in-public / show-and-tell launch post for founder communities
  (Show HN, Indie Hackers, r/SideProject, r/IMadeThis, r/buildinpublic,
  r/EntrepreneurRideAlong, r/SaaS, r/microsaas, r/RoastMyStartup) surfaced
  from the mmccaff/PlacesToPostYourStartup list — draft only, not posted
platforms:
  - hackernews
  - indiehackers
  - reddit-founder-communities
status: show-hn-posted-2026-09-20; other channels still pending
---

## Before posting anywhere (read this first)

- Check each destination's current self-promo rules right before posting —
  several of these subs restrict self-promo to a specific weekly thread or
  require flair/minimum karma, and rules change over time. Don't assume this
  note is still accurate.
- **r/SideProject checked 2026-09-07:** no configured subreddit rules (both
  old.reddit's `/about/rules` and new-reddit's sidebar show no rules widget
  at all), no self-promo restriction, no stated karma/account-age minimum, no
  dedicated weekly self-promo thread. The only actual guidance, from the
  sidebar wiki: suggested title format **"[Project name] - [Short
  description]"**, and the stated purpose is "sharing and receiving
  constructive feedback on side projects." Confirmed live: the front page
  right now is full of plain "I built X" self-posts from the last few hours,
  unremoved — this is clearly normal, accepted content here today. Use the
  title `Kith - free AI note-taking + scheduling for therapists` (or similar,
  matching their format) rather than the generic build-in-public title below
  when posting specifically to r/SideProject. Worth a re-check before
  posting if this is done more than a few days from now, since a mod team
  can add rules or a self-promo thread requirement at any time.
- Post from a real, disclosed account — same authorship-disclosure standard
  as every Reddit entry in `content/social/reddit-ideas.md`.
- One destination at a time, not a cross-post blast the same hour — several
  of these communities overlap in membership and a simultaneous multi-sub
  post reads as spam.
- Ground truth only (same list as `docs/influencer-agent-runbook.md`) — don't
  add stats, user counts, or revenue numbers that aren't real.
- **Link formatting (standing convention from 2026-09-07):** on any platform
  that renders markdown (Reddit, Indie Hackers), hyperlink the first mention
  of "Kith" itself — `[Kith](https://kith.space)` — rather than leaving the
  product name as plain text with the URL only at the bottom. Still also put
  the bare `kith.space` link at the bottom as its own line, so it's visible
  even if someone skims past the inline link. On plain-text-only platforms
  (Hacker News doesn't render markdown), inline hyperlinking isn't possible —
  just keep the bare URL, which HN auto-links anyway.

## Show HN

**Posted 2026-09-20** as kithmedai: https://news.ycombinator.com/item?id=49773497

**Title:** Show HN: Kith – Ambient AI session notes for therapists (free, DPDP-aligned)

**Post text:**

Hi HN — I built Kith, a practice-management + AI note-taking tool for
therapists, built first for the India/UK market.

It listens to a therapy session — through the device mic for in-person
sessions, or a bot that joins the call for online sessions on Google Meet —
and turns the transcript into a structured clinical note (SOAP, DAP, BIRP, or
EMDR) through a two-step AI pipeline: one pass compresses the raw transcript,
a second structures it. Recording consent and AI-processing consent are two
separate, explicit gates rather than one bundled checkbox, tracked
server-side.

Beyond notes: conflict-checked scheduling, recurring appointments with
auto-generated Google Meet links, patient records imported from CSV/Excel,
and PDF export of any note. Sensitive fields are encrypted at rest with
per-therapist row-level security, built around India's DPDP Act 2023 rather
than retrofitted from HIPAA.

It's free, no card required, and paid tiers aren't live yet — so free is
genuinely the whole product today, not a trial.

What's not here yet: two-way calendar sync (currently one-way, pulls Google
Calendar events in to check conflicts), automated reminders to patients (only
an in-app 15-minute heads-up to the therapist), and no billing/insurance
claims support.

Would love feedback, especially from anyone who's designed consent flows for
AI processing of sensitive personal data — that was the harder design problem
here, not the transcription itself.

## Build-in-public version (Indie Hackers / r/SideProject / r/IMadeThis / r/buildinpublic / r/EntrepreneurRideAlong / r/SaaS / r/microsaas / r/RoastMyStartup)

**Title:** I built a free AI note-taking + scheduling tool for therapists (ambient transcription, no card required)

**Post text:**

Been building this for a few months — [Kith](https://kith.space) is a
practice-management tool for therapists that also drafts session notes
automatically.

The core idea: instead of typing notes during or after a session, it
listens — device mic for in-person sessions, a bot that joins the call for
online sessions on Google Meet — and a two-step AI pipeline turns the
transcript into a SOAP/DAP/BIRP/EMDR note, a plain-English summary, and a
homework/next-session-plan field. Recording consent and AI-processing consent
are separate opt-ins, not one bundled checkbox — that's the part I spent the
most time getting right, since it's sensitive clinical data, not a nice-to-have.

It also does conflict-checked scheduling, recurring appointments with
auto-generated Meet links, CSV/Excel patient import, and PDF export of notes.
Free to start, no card required — paid tiers aren't live yet, so free is
genuinely the whole product right now, not a limited trial.

Built around India's DPDP Act 2023 for compliance (field-level encryption,
per-therapist row-level security), since most tools in this space are
HIPAA-first and don't map cleanly onto India/UK practices.

Happy to answer questions about the AI pipeline, the consent design, or
anything else — genuinely looking for feedback, not just traffic.

kith.space if anyone wants to poke at it.
