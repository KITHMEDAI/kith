# Outreach Prospect Research Runbook

This produces a **reviewed candidate list**, nothing more. It does not send anything to
anyone. That's intentional, not a placeholder — actually contacting people on the list
this produces requires a separate, explicit, per-batch decision from a human at Kith.
Do not build automation that skips that step.

## Why this exists as a separate, more limited tool

The opt-in capture + nurture sequence (lib/nurture.ts, /api/leads/capture) is safe to
run fully unattended because consent happens first, every time, before any contact.
Reaching out to someone who hasn't opted in is a different situation — even in a
professional B2B context, it carries real legal and reputational risk:

- **WhatsApp**: Meta's Business Policy prohibits unsolicited outreach. This is
  automatically detected and enforced — it can get the business number and linked
  Meta assets banned. **Never use WhatsApp for cold outreach from this list. Ever.**
  Only message someone on WhatsApp after they've opted in through some other channel.
- **Email**: UK PECR / EU ePrivacy law require consent or a narrow "soft opt-in"
  exception for marketing email to individual subscribers — most solo therapists count
  as individual subscribers, not the more permissive "corporate subscriber" category.
  India's DPDP Act + TRAI's commercial-communication rules impose similar restrictions.
  Cold B2B email to professionals is common industry practice, but "common practice"
  isn't the same as "risk-free" — treat every send as something a human should approve.
- **Scraping**: whatever directory or site a contact is sourced from likely has terms
  of service that restrict automated scraping, separate from what's legal to do with
  the data once you have it. Prefer sources that are openly public and don't require
  bypassing any access controls (public directory listings, professional association
  member pages meant for public discovery) over anything requiring login/scraping
  workarounds.

## What this tool actually does

1. Research legitimate, public sources of therapist/practice contact information in
   the target regions (India, UK, secondary: wider Europe) — professional association
   directories, public practice listing pages, published contact info on a
   practice's own public website. Use WebSearch/WebFetch.
2. For each candidate, record: name/practice name, region, source URL (where you found
   the public contact info), and the contact info itself *only if it's already publicly
   published for business-discovery purposes* (e.g., a "Contact us" page) — not
   personal/private information incidentally exposed elsewhere.
3. Write the candidates to `content/outreach/candidates-<date>.csv` (columns: name,
   practice, region, contact, source_url, notes). Do not write to any other location.
4. Stop. Do not draft outreach messages in this same run — that's a separate step a
   human should explicitly ask for, reviewing the candidate list first.
5. Cap each run at 20–30 candidates. This is meant to build a list gradually with
   real review at each stage, not to maximize volume.

## What happens after this runbook produces a list

A human reviews `content/outreach/candidates-<date>.csv`, decides which (if any)
candidates to actually contact, and explicitly asks for outreach message drafts for
that specific, reviewed subset — at which point the same rules as the content agent
apply: draft only, no auto-send, real safeguards (clear sender ID, one-click
unsubscribe, honest content) on anything that does eventually go out.

This runbook does not have a companion scheduled task. Unlike content drafting, list
research for cold outreach should stay a deliberate, occasional, human-initiated
action — not something that runs on a timer in the background.
