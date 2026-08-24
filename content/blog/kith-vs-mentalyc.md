---
title: "Kith vs Mentalyc: An Honest AI Notes Alternative"
description: "An honest look at Kith as a Mentalyc alternative — pricing, note formats, session capture, and where Mentalyc's US-built tooling still wins."
date: "2026-09-20"
keyword: "mentalyc alternative"
category: "AI Clinical Documentation"
draft: true
---

Mentalyc comes up constantly in searches for AI progress-note tools — it's one of the more established names in the space, with a template library that goes well beyond SOAP notes and a reported user base in the tens of thousands. Like Upheal, it's a documentation-first tool rather than a full practice-management platform, which makes it a closer comparison to Kith than something like SimplePractice. This is an honest look at Kith as a Mentalyc alternative: what Mentalyc actually does well, where its US-built compliance and billing framing doesn't carry over to India or the UK, and where it's still the stronger pick regardless of where you practice.

## What Mentalyc actually offers

Mentalyc is built specifically around AI-generated clinical notes, and it gives you more than one way to get a session into the system: record a session live (in-person or telehealth), upload an audio file after the fact, dictate a recap, or type a short summary yourself. That flexibility means it doesn't require a specific telehealth integration — it works with whatever video tool a practice already uses, because the input is just audio.

The note-format library is genuinely deep. Beyond SOAP and DAP, Mentalyc supports BIRP, GIRP, PIRP, PIE, and more, plus dedicated formats for intake notes, supervision and consultation notes, and psychiatric evaluations and biopsychosocial assessments. Its Pro tier adds over 100 custom templates, EMDR and play-therapy specific modalities, and support for individual, couple, family, group, and child client types. On top of note generation, Mentalyc offers "Alliance Genie" (a therapeutic-alliance tracking feature), an AI treatment planner, an AI progress tracker, and auto-computed CPT billing codes.

Pricing runs on a tiered monthly-note-allowance model rather than a flat subscription: Mini at $19.99/month for 40 notes, Basic at $39.99/month for 100 notes, Pro at $69.99/month for 160 notes, and Super at $119.99/month for 330 notes, each with roughly 25% off for annual billing. Team plans run $49.99–59.99 per seat (introductory pricing) with unlimited notes under a fair-use policy. There's a 14-day free trial with full Pro-tier access and 15 notes included, no card required — but unlike Kith, there's no ongoing free plan once the trial ends.

On compliance, Mentalyc states it's fully HIPAA-, PHIPA-, and SOC 2 Type II-compliant, provides a signed BAA to every customer, and says session audio is deleted after a short retention window (used only for note fixes and retries) rather than stored long-term. It also lists direct one-way note-export integrations with six US-specific EHRs — TherapyNotes, ICANotes, TheraNest, Valant, SimplePractice, and TheraBill.

## Where Mentalyc falls short for India and the UK

The pattern here is the same one that shows up with most AI notetaking tools built in the US first: Mentalyc's compliance program is built around HIPAA (US) and PHIPA (Canada), with privacy-principle framing for Australia layered on top. There's no mention of India's Digital Personal Data Protection Act, 2023, or UK GDPR anywhere in how it describes itself — we've written a [full breakdown of DPDP requirements for Indian therapists](/blog/dpdp-2023-therapist-notes) and a [separate one on UK GDPR and AI notetaking](/blog/gdpr-ai-notetaking-uk). Being HIPAA-compliant doesn't automatically satisfy either — the consent structure, cross-border data transfer rules, and breach-notification timelines differ by jurisdiction, not just by name.

The CPT auto-coding and the six EHR integrations are also built for the US billing and referral ecosystem specifically. CPT codes are a US insurance billing standard; if you're a therapist in India or the UK billing clients directly, that tooling isn't doing anything for your workflow, and none of the six connected EHRs are commonly used outside the US.

Worth naming plainly too: Mentalyc has no ongoing free tier. The 14-day trial is generous in scope, but once it ends, using Mentalyc at all means picking a paid plan starting at $19.99/month — there's no "keep using it free at a smaller scale" option the way Kith or Upheal's free tiers offer.

## What Kith offers as a Mentalyc alternative

Kith was built India/UK-first rather than adapted from a US product afterward. A few differences that matter in practice:

**Ambient transcription, not something you start or upload.** For in-person sessions, Kith listens through your device mic without a manual record button or a separate upload step afterward — the transcript exists because the tool was already listening during the conversation you'd have anyway. We've written more about [how ambient transcription actually works](/blog/ambient-session-transcription). For online sessions, a notetaker bot joins the Google Meet call directly, rather than requiring you to record and upload audio yourself.

**A narrower but purpose-built note pipeline.** Kith runs the transcript through a compression pass and then a structuring pass to produce a SOAP note, key points, a session summary, homework, and a next-session plan. That's a fraction of Mentalyc's template library — no DAP, BIRP, GIRP, PIE, or psychiatry-specific formats today — but every note traces back to what was actually said in the session, not a template filled in afterward from a recap or upload.

**Consent handled as two separate, server-tracked gates.** Recording consent and AI-processing consent are tracked independently. A patient agreeing to be recorded isn't automatically agreeing to that recording being processed by AI — collapsing those into one checkbox is a shortcut that tends to catch up with a practice later.

**DPDP-aligned field encryption and row-level security by default**, rather than a HIPAA/PHIPA compliance program built for other jurisdictions. Sensitive fields are encrypted at rest, and each therapist's data is isolated at the database level.

**Free to start, with no time limit.** Kith's free plan has no card required and no 14-day clock. Kith's paid tiers aren't fully live yet, so right now free is the only option — not a trial designed to convert you into a note-allowance subscription.

## Outside the AI notes themselves

Neither tool is a full practice-management platform, but the shape of what each one covers beyond notes is different. Mentalyc is explicitly documentation-only: no scheduling, no calendar, no billing automation, no client portal — its outward integrations are one-way note exports into a handful of US EHRs, and its CPT-code and treatment-planner tooling exist to make the note itself more useful for US insurance billing, not to manage the practice around it.

Kith goes a little further on the practice side without becoming a full EHR: conflict-checked appointment scheduling, recurring appointments, and an auto-created Google Meet link for each online booking. Patient records can be imported from an existing CSV or Excel file rather than re-entered by hand, and any session note can be exported as a PDF directly from the record. If your practice currently keeps patient data in a spreadsheet and books sessions by hand, that's a real gap Mentalyc doesn't attempt to close — you'd still need a separate scheduling tool or EHR alongside it.

## The session-capture difference, looked at closely

This is the part that most changes day-to-day workflow, so it's worth being specific. Mentalyc's model is capture-then-process: you record live, upload a file, dictate a recap, or type a summary, and the note gets generated from whichever input you gave it. That flexibility is a real strength — it works regardless of what telehealth platform you use, and it accommodates therapists who'd rather dictate a two-minute recap than have every session recorded in full.

Kith's model is narrower and fully automatic within that scope: one always-listening mic-based path for in-person sessions, one notetaker-bot path for Google Meet specifically. There's no upload option and no dictate-a-recap fallback — if a session wasn't captured through one of those two paths, there's no note to generate. If your practice runs online sessions on Zoom or Teams rather than Google Meet, Mentalyc's upload-after-the-fact option currently covers ground Kith's automatic capture doesn't reach at all.

## Feature-by-feature comparison

| | Mentalyc | Kith |
|---|---|---|
| Starting price | 14-day free trial (Pro features, 15 notes), then $19.99–119.99/month | Free |
| AI session notes | Included, tiered by monthly note allowance | Included, unlimited |
| Note format options | SOAP, DAP, BIRP, GIRP, PIRP, PIE, and 100+ templates on Pro | SOAP, key points, summary, homework, next-session plan |
| In-person capture | Live record, upload audio, dictate, or type a summary | Ambient, via device mic — no button to press |
| Online capture | Record or upload from any telehealth platform | Notetaker bot joins Google Meet automatically |
| Treatment plans / progress tracking | AI treatment planner + progress tracker included | Not offered |
| CPT billing codes | Auto-computed on paid tiers | Not offered |
| EHR integrations | One-way export to 6 US EHRs | None |
| Scheduling / calendar | Not offered | Conflict-checked scheduling, recurring appointments, Google Meet auto-link |
| Compliance framing | HIPAA (US), PHIPA (Canada), SOC 2 | DPDP-aligned (India), field encryption + RLS |

## Where Mentalyc is still the better choice

To be fair to it: if you want a deep library of note formats beyond SOAP, AI-generated treatment plans with progress tracking, or auto-computed CPT codes for US insurance billing, Mentalyc offers real depth there that Kith doesn't attempt today. Its flexible capture options — record, upload, dictate, or type — also mean it works with any telehealth platform, not just Google Meet, which matters if your practice runs on Zoom or Teams. And if you're practicing in the US or Canada, its HIPAA/PHIPA compliance framing and direct EHR exports are built for exactly your situation, not adapted from somewhere else.

## Frequently asked questions

**Is Mentalyc available to therapists in India or the UK?**
Nothing restricts account creation geographically, but Mentalyc's compliance program, CPT billing tooling, and EHR integrations are all built around the US market, with additional framing for Canada and Australia. It's usable from India or the UK, but not built for either.

**Does Kith offer the same note-format variety as Mentalyc?**
No. Mentalyc supports SOAP, DAP, BIRP, GIRP, PIRP, PIE, and 100+ additional templates on its Pro tier. Kith produces a SOAP note, key points, a session summary, homework, and a next-session plan — narrower by design, but not a template library you configure.

**Does Kith have a free plan like Mentalyc's trial?**
They're different structures. Mentalyc's free access is a 14-day, 15-note trial of its Pro tier, after which a paid plan is required. Kith's free plan has no time limit or note cap, though it's also a simpler feature set since Kith's paid tiers aren't live yet.

**Can Kith import a session I already recorded on Zoom?**
No. Kith doesn't have an upload path — its capture is ambient mic recording for in-person sessions and a Google Meet notetaker bot for online ones. If you need to generate a note from an existing recording or from a Zoom session, Mentalyc's upload option currently covers that and Kith's doesn't.

## Which should you pick

If you want a wide range of note formats, AI treatment-planning and progress-tracking tools, CPT auto-coding for US insurance billing, or you need to capture sessions from a telehealth platform other than Google Meet, Mentalyc's feature set covers ground Kith doesn't. If you're a solo or small-practice therapist in India or the UK who wants ambient, no-button in-person capture, a Google Meet notetaker bot for online sessions, conflict-checked scheduling alongside your notes, and compliance framing built around DPDP or UK GDPR rather than HIPAA, [Kith](/) is worth trying — it's free with no trial clock, so the most honest comparison is running a real session through both and seeing which one actually fits how you practice.

Sources consulted for Mentalyc pricing and features: the Mentalyc pricing page, Mentalyc's homepage, and a third-party review covering its EHR integrations and scope of functionality, checked at the time of writing. Pricing and plan structure can change — verify current numbers directly with Mentalyc before making a decision based on this post.
