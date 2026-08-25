---
title: "Kith vs Upheal: An Honest AI Notes Alternative"
description: "An honest look at Kith as an Upheal alternative for therapists — pricing, session capture, compliance framing, and where Upheal is still the stronger pick."
date: "2026-08-23"
keyword: "upheal alternative"
category: "AI Clinical Documentation"
---

If you've been comparing AI notetaking tools for therapy, Upheal is one of the names that comes up constantly — it's built a real reputation specifically around AI-assisted documentation, not practice management with AI bolted on. That makes it a closer comparison to Kith than a broad platform like SimplePractice. This is an honest look at Kith as an Upheal alternative: what Upheal actually does well, where it doesn't fit a practice outside the US, and where it's still the better pick even for practices it wasn't built for.

## What Upheal actually offers

Upheal's free plan is genuinely usable, not a crippled trial — it includes unlimited notes (with some features limited), automatic AI note generation, its own HIPAA-compliant telehealth platform, calendar and scheduling, a client portal with messaging, practice forms, and session capture across video, audio, text, or upload. For a free tier, that's a lot bundled in.

Paid usage moves to a per-session model: the Individual plan charges $1 per session conducted, capped at $69/month per provider — so past roughly 70 sessions a month, the cost stops climbing regardless of volume. That tier unlocks a genuinely deep feature set: note formats beyond SOAP (DAP, GIRP, BIRP, EMDR, PIRP, SIRP, PIE, and psychiatry-specific formats), AI-generated treatment plans built around a "Golden Thread" compliance model, a compliance checker, session transcripts with conversational analytics (talk-time ratios, question frequency, topic clustering), two-way Google Calendar sync, client self-scheduling, online payments via Stripe, superbills, and insurance billing. Group and Enterprise tiers add custom pricing, EHR migration help, team management, and SSO. There's also a 30-day full-feature trial with no card required before you commit to a paid tier.

That breadth is real. Upheal isn't just transcribing sessions and handing back a note — the treatment-plan tooling and session analytics in particular go further than most AI notetaking tools attempt, Kith included.

## Where Upheal falls short for India and the UK

The friction is the same shape as most US-first clinical tools: Upheal's telehealth platform and compliance messaging are built around HIPAA, the US health-data law. If you're practicing in India, your obligations run through the Digital Personal Data Protection Act, 2023 — we've written a [full breakdown of what that actually requires](/blog/dpdp-2023-therapist-notes) — and if you're in the UK, they run through UK GDPR, which we've also covered for [AI notetaking specifically](/blog/gdpr-ai-notetaking-uk). Being HIPAA-compliant doesn't automatically satisfy either of those — the consent structure, cross-border transfer rules, and breach-notification requirements are different laws with different obligations, not a stricter version of the same one.

The insurance billing and superbill tooling is also built around the US system. If you're billing clients directly in India or the UK rather than filing US insurance claims, that part of the paid tier isn't doing anything for you — you'd be paying into a feature set built for a market you're not in.

There's also a practical session-capture gap worth naming plainly: Upheal's in-person recording runs through a browser extension, a mobile app, or a MacOS app that you start manually at the beginning of a session. That's a reasonable design, and it's the same shape as most competitors in this space — but it does mean remembering to hit record, the same failure mode as any dictation tool, just moved earlier in the workflow.

## What Kith offers as an Upheal alternative

Kith was built India/UK-first, and its core design choices reflect that rather than retrofitting a US product for other markets. A few differences that matter in practice:

**Ambient transcription, not a recording you start.** For in-person sessions, Kith listens through your device mic without a separate record button — you have the conversation you'd have anyway, and the transcript exists because the tool was already listening. We've written more about [how ambient transcription actually works](/blog/ambient-session-transcription). For online sessions, a notetaker bot joins the Google Meet call directly, rather than capturing audio from a browser tab you have to keep active.

**A two-layer note pipeline.** Kith runs the session transcript through a compression pass and then a structuring pass to produce a SOAP note, key points, a session summary, homework, and a next-session plan. It's narrower than Upheal's multi-format template library — no DAP, GIRP, or EMDR-specific formats today — but it's built around the assumption that the note comes from what was actually said, not filled in from a template afterward.

**Consent handled as two separate gates.** Recording consent and AI-processing consent are tracked separately, server-side. A patient consenting to being recorded isn't automatically consenting to that recording being processed by AI — treating those as one checkbox is a shortcut that catches up with a practice later.

**DPDP-aligned field encryption and row-level security by default.** Sensitive fields are encrypted at rest, and each therapist's data is isolated at the database level, aligned to India's DPDP framework specifically rather than a HIPAA compliance program with a different jurisdiction's requirements layered on top afterward.

**Free to start, genuinely.** Kith has a free plan with no card required. Kith's paid tiers aren't fully live yet, so right now "free" is the only plan available, not a promotional price with a clock running. That's different from Upheal's model, where the free tier is deliberately limited to steer usage toward the metered plan.

## Outside the AI notes themselves

Both products do more than transcription, and it's worth being clear about where that overlaps and where it doesn't. Upheal's paid tier includes a client portal with messaging, client self-scheduling, online payments, and superbills — a fuller practice-management layer than Kith currently offers. Kith's scheduling is narrower: conflict-checked appointment booking, recurring appointments, and a Google Meet link created automatically for each online booking, but no client-facing self-booking or in-portal messaging today. Where Kith does go further is patient record handling day-to-day — importing existing patient records from a CSV or Excel file rather than re-entering them by hand, and exporting any session note as a PDF directly from the record. If your practice already has patient data sitting in a spreadsheet, that import path is a genuine time-saver switching over.

## The session-capture difference, looked at closely

This is worth slowing down on, because "AI notes" sounds like the same category until you look at how each product actually gets the audio. Upheal's approach is capture-what-you're-already-using: keep your existing video tool, install the extension or app, hit start. That's flexible — it works with whatever calling tool a practice already has habits around — and the built-in telehealth option means you're not forced to add a third-party video tool if you don't already have one.

Kith's approach is narrower and more automatic within that narrower scope: one mic-based path for in-person, one notetaker-bot path for Google Meet specifically. If your practice runs sessions on Zoom or Teams, Kith's online capture doesn't cover that today — Upheal's browser-tab and Zoom-app capture does. If your practice is Google Meet for online and in-person for everything else, Kith's ambient approach removes a manual step Upheal's doesn't.

Neither approach is strictly better — it depends on what tools your practice already runs on and whether "one less button to press" or "works with whatever I'm already using" matters more to you.

## Feature-by-feature comparison

| | Upheal | Kith |
|---|---|---|
| Starting price | Free (feature-limited); $1/session up to $69/month | Free |
| AI session notes | Included from free tier | Included |
| Note format options | SOAP, DAP, GIRP, BIRP, EMDR, and others | SOAP, key points, summary, homework, next-session plan |
| In-person capture | Manual start via browser extension or mobile app | Ambient, via device mic — no button to press |
| Online capture | Browser tab/desktop capture, Zoom app, or built-in telehealth | Notetaker bot joins Google Meet automatically |
| Session analytics (talk-time, tone, topics) | Included on paid tier | Not offered |
| Treatment plans / compliance checker | Included on paid tier | Not offered |
| Calendar sync | Two-way (Google) | One-way — pulls your Google Calendar in |
| Client self-scheduling | Included on paid tier | Not yet |
| Insurance billing | US claims, per-claim fee | Not offered |
| Compliance framing | HIPAA (US) | DPDP-aligned (India), field encryption + RLS |

That analytics and treatment-plan gap is a real one if session-level insight and structured treatment-plan tooling matter to your practice — it's not a rounding error, and it's worth weighing against everything Kith does instead.

## Where Upheal is still the better choice

To be fair to it: if conversational analytics, a wide library of note formats beyond SOAP, or built-in treatment-plan tooling with a compliance checker matter to your practice, Upheal offers real depth there that Kith doesn't attempt today. Its free tier is also more feature-complete out of the box than most competitors', and the per-session pricing cap means a busy solo practice knows exactly where the ceiling is. If your practice already runs on Zoom rather than Google Meet, Upheal's broader session-capture compatibility is a genuine advantage — Kith's online capture is Google Meet only right now.

## Frequently asked questions

**Is Upheal available to therapists in India or the UK?**
Nothing about account creation restricts it geographically, but the product's compliance framing, telehealth platform, and insurance billing are built around HIPAA and the US insurance system. It's usable from India or the UK, but not built for either specifically.

**Does Kith have session analytics like Upheal does?**
No. Upheal's talk-time, tone, and topic-clustering analytics are a feature Kith doesn't offer today. If that kind of session-level insight matters to your practice, that's a genuine reason to prefer Upheal.

**Is Kith cheaper than Upheal?**
Kith is currently free with no paid tier live yet, so there's no cost to compare directly against Upheal's $1-per-session model. That will change once Kith's paid plans roll out — this isn't a permanent pricing advantage, just where things stand today.

**Can Kith capture sessions on Zoom or Microsoft Teams?**
Not today. Kith's online session capture is a notetaker bot for Google Meet specifically. If your practice runs on Zoom or Teams, Upheal's browser-tab capture and dedicated Zoom app currently cover more ground.

## Which should you pick

If you want deep session analytics, a wide range of note formats, treatment-plan tooling with a compliance checker, or you're running sessions on Zoom rather than Google Meet, Upheal's feature set covers ground Kith doesn't. If you're a solo or small-practice therapist in India or the UK who wants ambient, no-button in-person capture, a Google Meet notetaker bot for online sessions, and compliance framing built around DPDP or UK GDPR rather than HIPAA, [Kith](/) is worth trying — it's free to start, so the most honest comparison is running a real session through both and seeing which workflow actually disappears into the background.

Sources consulted for Upheal pricing and features: the Upheal pricing page, Upheal's session-formats feature page, and Upheal's support documentation, checked at the time of writing. Pricing and plan structure can change — verify current numbers directly with Upheal before making a decision based on this post.
