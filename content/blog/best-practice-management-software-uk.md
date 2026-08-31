---
title: "Private Practice Software for UK Counsellors (2026)"
description: "A practical comparison of private practice software for UK counsellors — Kith, WriteUpp, Bloom, Cliniko, and SimplePractice — with real GBP pricing."
date: "2026-10-04"
keyword: "private practice software uk"
category: "Running a Private Practice"
draft: true
---

If you're searching for private practice software as a counsellor or therapist in the UK, you'll run into two different kinds of results: platforms built specifically for UK healthcare practices, priced in GBP with GDPR front and centre, and bigger global names that show up in every generic "best EHR" list regardless of what country you're searching from. The two don't serve you equally well. This is a grounded look at five options that actually come up in this search — what each one genuinely offers, what it costs in real terms, and where each one does or doesn't fit a UK-based solo or small counselling practice.

## What actually matters when choosing private practice software in the UK

A few things decide whether private practice software actually works for a UK-based counsellor, and they're easy to miss in a feature-list comparison:

- **Currency and where the company is actually based.** A tool that quotes GBP on its pricing page isn't automatically UK-run — check whether that's a genuine local price or a currency-converted US or Australian one.
- **Compliance framing.** UK GDPR and the Data Protection Act 2018 are what actually govern a counselling practice here, not HIPAA. We've covered this in detail for [AI notetaking specifically in the UK](/blog/gdpr-ai-notetaking-uk) — a platform built around HIPAA compliance isn't automatically covering UK GDPR's specific consent, lawful-basis, and data-residency requirements.
- **Where client data is hosted.** EU/UK-based hosting matters more under UK GDPR than under most other privacy frameworks, since cross-border transfer rules are stricter.
- **What "practice management" actually includes.** Scheduling and invoicing are table stakes; the meaningful differences show up in whether notes are AI-generated from the session or a template you fill in, and whether client-facing tools like online booking or e-signatures are bundled or extra.

With that in mind, here's how five options that come up in this search compare.

## Cliniko

Cliniko is one of the more established general practice-management platforms used across the UK, Australia, and elsewhere, covering multi-discipline clinics as much as solo counselling practices. It includes unlimited patients, unlimited file storage, unlimited admin and reception users, and unlimited locations on every tier, priced by practitioner count: $45/month for one practitioner, $95/month for 2–5, rising from there.

The detail worth knowing before you commit: despite being widely used in the UK, Cliniko's pricing page states prices are in US dollars, not GBP — it's an Australian company, and UK customers are billed in USD with the currency conversion that implies. It's a broad, mature scheduling-and-records platform, but it isn't built with counselling-specific documentation (like AI-generated session notes) as a core feature, and it isn't a UK-priced product despite its popularity here.

## SimplePractice

SimplePractice is the platform most likely to surface first in a generic search, because of how dominant it is in the US market. It bundles scheduling with client self-booking, integrated telehealth, customisable note and intake templates, a client portal, and insurance claims filing, priced at Starter $49/month, Essential $79/month, and Plus $99/month, with AI note-taking as a separate paid add-on on top of any tier.

For a UK counsellor, the friction is the same pattern as with Cliniko but more pronounced: everything is USD-priced, the insurance-claims workflow (a large part of what the pricing is built around) is designed for US insurers and does nothing for a UK practice billing clients directly, and the compliance framing is HIPAA rather than UK GDPR. We've compared this in more depth (with an India/UK lens) in [Kith vs SimplePractice](/blog/kith-vs-simplepractice) — the short version here is the same: a capable, expensive-for-what-you'll-use platform built around a US regulatory and billing context that doesn't map onto a UK counselling practice.

## WriteUpp

WriteUpp is built specifically for UK healthcare and therapy practices — counsellors, psychotherapists, psychologists, and allied health professionals — and it's priced and billed in GBP. Pricing runs on a per-user model: a Flex plan from £19.95/month, a Solo plan at £27.95/month (one clinician user, one non-clinical user, online booking, and 100 SMS credits included), a Solo + AI Scribe plan at £49.95/month, and a Group plan from £45.95/month for practices with two or more clinicians, with additional users priced separately as a practice grows. It covers the practical basics well: scheduling, client records, appointment reminders, SOAP-format notes, and consent management, plus a privacy mode that hides client names in the diary view.

Its AI scribe is a separate, higher-priced tier rather than something included by default, and like most tools on this list its clinical documentation outside that add-on is template-based — you're filling in structured fields rather than getting a note generated from the session itself unless you're paying for the AI tier specifically.

## Bloom

Bloom is a newer, narrower tool built specifically for UK-based solo private therapists rather than adapted from a broader clinic-management product. It covers appointment scheduling with recurring sessions, client self-service booking without requiring the client to create an account, AES-256 encrypted session documentation, automated email reminders, Stripe-based payment processing, and e-signature collection for counselling agreements. It's priced simply — £29 per therapist per month, or £290 per year — with no separate platform fees beyond Stripe's standard card-processing charges, and it's explicit about GDPR compliance, ICO registration, and EU/UK-based hosting.

Being solo-practitioner-focused is both its strength and its limit: it's a tighter, more affordable fit for someone running a one-person practice than a multi-practitioner platform like Cliniko or WriteUpp's Group tier, but it isn't built to scale into a multi-therapist setup the way those two are.

## Kith

Kith takes a different approach specifically on the note-writing side: rather than a template you complete after each session, it listens during the session — through your device mic for in-person sessions, or through a notetaker bot that joins the call for online sessions on Google Meet — and turns the transcript into a structured note through a two-layer AI pipeline (a compression pass, then a structuring pass), producing a SOAP note, key points, a session summary, homework, and a next-session plan. Recording consent and AI-processing consent are tracked as two separate, server-side gates rather than one bundled checkbox. On the scheduling side, Kith offers conflict-checked appointments, recurring bookings, and an auto-created Google Meet link for each online session, along with patient records imported from an existing CSV or Excel file and PDF export of any session note. Sensitive fields are encrypted at rest with per-therapist row-level security.

To be direct about the gaps: Kith doesn't currently offer client-facing payment collection, invoicing, or e-signature tools — all things WriteUpp, Bloom, and Cliniko provide in some form. Calendar sync with Google Calendar is one-way (it pulls events in; it only pushes out the Meet link it creates for its own bookings), and reminders are an in-app 15-minute toast rather than the automated SMS or email reminders WriteUpp and Bloom send to clients directly. Kith's paid tiers also aren't live yet, so the free plan is currently the only option, with no card required to start.

If ambient, automatic session notes are the piece of admin you most want solved, Kith does that more directly than any of the other four tools here — none of them generate a note from the session itself without either a manual upload step or a separately-priced add-on. If client billing, e-signatures, or automated SMS reminders are what you actually need day to day, WriteUpp or Bloom currently cover that ground and Kith doesn't yet.

## Feature-by-feature comparison

| | Kith | WriteUpp | Bloom | Cliniko | SimplePractice |
|---|---|---|---|---|---|
| Starting price | Free | £19.95/month | £29/month | $45/month | $49/month |
| Currency | N/A (no billing feature) | GBP | GBP | USD | USD |
| Built specifically for UK practices | Compliance-aligned, not UK-exclusive | Yes | Yes | No (Australian) | No (US) |
| AI session notes from transcript | Yes, ambient, included | Add-on, £49.95/month tier | Not offered | Not offered | Add-on, extra cost |
| Client payments / invoicing | Not offered | Included | Stripe integration | Included | Included, plus insurance claims |
| E-signatures | Not offered | Not listed as core | Included | Not listed as core | Included |
| Client reminders | In-app toast only | SMS (100 credits/mo) | Email | Not therapy-specific | Email/SMS |
| Compliance framing | UK GDPR-aligned | UK GDPR, ICO-aware | GDPR, ICO registered, EU/UK hosting | General security, not UK-specific | HIPAA |
| Free plan | Yes (only plan for now) | No | No | No | No |

## Which one actually fits your practice

If billing, e-signatures, and SMS reminders are the admin you most want off your plate, WriteUpp is the most complete UK-built answer on this list, with Bloom a leaner and cheaper alternative if you're solo and don't need multi-practitioner scaling. If you're already invested in Cliniko or SimplePractice for other reasons — multi-discipline scheduling, insurance billing, an existing client base used to the portal — the currency and compliance-framing caveats are worth knowing rather than a reason to switch on their own. If what actually eats your time is writing up notes after every session and you'd rather that draft come from the conversation itself, Kith is the option built specifically around that, free to start, without payment or e-signature features to configure because it isn't trying to be a full practice-management suite yet.

None of these five covers everything a UK private practice needs today — the honest picture is that WriteUpp and Bloom currently lead on UK-native billing and client-facing admin, while Kith currently leads on how the clinical note itself gets written, and the right pick depends on which part of that admin burden is actually costing you the most time.

## Frequently asked questions

**Is there a genuinely free private practice tool for UK counsellors?**
Of the five compared here, only Kith currently has a free plan (which is also its only plan right now, since paid tiers aren't live yet). WriteUpp, Bloom, Cliniko, and SimplePractice are all paid from the start, typically with a free trial period rather than an ongoing free tier.

**Which of these are actually priced in GBP rather than converted from another currency?**
WriteUpp and Bloom are both UK-built and priced natively in GBP. Cliniko and SimplePractice bill in USD regardless of where you're based; Kith doesn't currently have a billing feature at all.

**Do any of these generate session notes automatically from the conversation?**
Kith generates notes from the session transcript by default. WriteUpp offers this as a separate, higher-priced AI Scribe tier. Bloom and Cliniko don't offer AI-generated notes; SimplePractice's AI note-taking is a paid add-on rather than a built-in feature.

**Is UK GDPR compliance the same as HIPAA compliance?**
No. They're separate legal frameworks with different lawful-basis, consent, and data-residency requirements. A platform marketed as HIPAA-compliant hasn't necessarily addressed UK GDPR's specific rules, so it's worth checking directly with any vendor rather than assuming one compliance claim covers the other.

Sources consulted for this comparison: WriteUpp's own pricing page, Bloom's website, and Cliniko's pricing page, checked at the time of writing; SimplePractice pricing cross-checked against the existing Kith vs SimplePractice post on this site. Pricing, plans, and features change — verify current details directly with each vendor before deciding.
