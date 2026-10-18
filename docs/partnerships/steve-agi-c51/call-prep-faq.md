# Call prep & FAQ — Steve Agi, Tue 20 Oct 2026

**When:** 9:30–10:15am IST / 3:00–3:45pm Melbourne (AEDT)
**Link:** https://meet.google.com/adu-unzx-zmj
**Money: principles only, no numbers** (see `money-plan.md`). Full model answers
are in `mock-call-rehearsal.md`.

---

## 1. Game plan (what this call is for)

Our goals for the deal overall: **earning → exposure → connections**. This call
is step one, so the aim is narrower:

1. **Agree on one specific problem:** NDIS support-worker raw notes / voice → structured,
   goal-linked case notes, with mandatory human review.
2. **Find out what C51 already has:** the NDIS Documentation Assist demo. Is it a
   live product, a prototype, or slides? Any users?
3. **Find out who the pilot organisation could be.** Does he have a real, named,
   warm contact?
4. **Show we're credible:** honest, specific answers. **No demo this call**
   (decided 2026-10-18); offer one for the follow-up, built around an NDIS-style
   sample note.
5. **Leave with a concrete next step:** e.g. he intros us to one provider for a
   discovery chat, and we send a 1-page pilot outline.

**Don't:** commit to building anything, agree to fees, agree to exclusivity, or
share source code or architecture details beyond a high-level overview.

---

## 2. Kith in 60 seconds (what you can honestly say)

> "Kith is an AI clinical-documentation tool, live at kith.space. A practitioner
> records a session (in person through the browser mic, or online through a
> notetaker bot that joins Google Meet or Teams), or just types rough notes, and Kith
> turns that into a structured clinical note. The practitioner reviews and edits it
> before it's final. It runs in production with encryption, per-practitioner access
> control and live billing. We're pre-revenue: it's founder-built and tested, but
> we haven't found our market yet, which is exactly why this conversation interests me."

### What's real (safe to claim)
- **Live in production** at kith.space (Vercel + Supabase), with login and Google sign-in.
- **Two-stage AI note pipeline:** stage 1 cleans up the transcript and repairs words
  the speech-to-text wasn't confident about, using context (e.g. "panNICK" →
  "panic attack"); stage 2 writes the structured note (SOAP format, concise bullet points).
- **Three input paths:** in-person mic recording with live transcription; online
  sessions via a meeting bot; **typed rough notes → structured note**.
- **Public tool:** **kith.space/soap-formatter**. Paste rough notes, get a structured
  note. No login, nothing stored. Almost exactly the NDIS "raw notes → case note"
  job. Not demoing it this call, but you can mention it or share the link afterwards.
- **Human in control:** notes are drafts the practitioner reviews; the practitioner's
  own private notes feed into the AI.
- **Safety-first design:** we removed every AI-guessed number (mood scores, "time
  saved", risk badges) because we only show measured data. A risk banner appears
  only on the note-detail page, so a disclosure (e.g. self-harm) is never invisible.
- **Security:** encryption in transit and at rest, plus app-level field encryption;
  database row-level security so each practitioner sees only their own data;
  encrypted OAuth tokens.
- **Scheduling:** appointment booking with conflict detection, recurring sessions,
  read-only Google Calendar import, automatic Google Meet creation for video sessions.
- **PDF export** of notes. **Patient import** from CSV/Excel.
- **Billing live** (Razorpay, India).

### What's NOT there yet (say so plainly; he values honesty)
- **No paying customers / real users yet.** All accounts are our own test accounts.
- **Hosted outside Australia;** AI and speech-to-text calls go to US providers. AU
  hosting is possible (Supabase/Vercel Sydney regions, AU AI endpoints) but not set up.
- **No ISO 27001 / SOC 2 certification**, no pen test, no Essential Eight assessment.
- **Not end-to-end encrypted** (the AI has to read the text). Say "encrypted in
  transit and at rest, access-controlled". **Never say "end-to-end".**
- **No NDIS-specific templates yet** (goal-linking, incident reports, progress notes
  in NDIS format), but the engine is template-driven, so this is configuration
  plus prompt work, not a rebuild.
- **The online meeting-bot path** is built but hasn't been fully tested against real
  calls in production. Don't demo it.
- **No integrations** with NDIS platforms (ShiftCare, Brevity, etc.).
- **Small team** (see Q12; you need to decide how to answer this).

---

## 2b. Tech deep dive: the engine, stack and hosting

He said he wants to see whether Kith's tech can "complement" C51's work, and he
flagged "security foundations". Expect him to probe here. Facts below were checked
against the codebase on 2026-10-18.

### How the engine works (explain it like this)
> "Input comes in three ways: live audio, a meeting bot, or typed notes. Audio is
> transcribed in real time, and words the speech model wasn't sure about get
> flagged. Stage one is a fast AI model that repairs those flagged words using the
> whole conversation as context, then condenses the session into a clinical brief.
> Stage two is a stronger model that writes the structured note: SOAP sections,
> key points, homework, next-session plan. The practitioner's own private notes feed
> into it. The output is always a draft for the practitioner to review and edit.
> Notes are also indexed for semantic search, so you can find 'sessions where we
> discussed sleep' across a client's history."

**What makes it more than "ChatGPT with a prompt"** (his own demo is OpenAI on Bolt):
- Real-time transcription with **clinical vocabulary boosting** (around 40 drug,
  disorder and technique terms) and **low-confidence word repair**. Generic
  prompt tools can't do this.
- A **two-stage pipeline** (repair and condense → write) that handles long sessions:
  we fixed truncation and JSON failures found on real 13-minute, 320-segment sessions.
- **Production plumbing:** auth, per-user data isolation, encryption, retries for
  stuck sessions, PDF export, scheduling, billing. That's the difference between a
  demo and something a provider can trust with real client data.
- **Clinical-safety choices:** no AI-invented numbers, a risk banner so disclosures
  aren't missed, and human review by design.

### Tech stack
| Layer | What we use |
|---|---|
| App | Next.js 14 (React, TypeScript) |
| Hosting | Vercel |
| Database + auth | Supabase (Postgres + Supabase Auth, Google sign-in) |
| Note AI | Anthropic Claude: Haiku 4.5 (stage 1) + Sonnet 4.6 (stage 2) |
| Speech-to-text | Deepgram (real-time streaming, nova-3) |
| Online meetings | Recall.ai meeting bot (Google Meet / Teams) |
| Search | Voyage AI embeddings (semantic search over notes) |
| Email / SMS | Resend / Twilio |
| Monitoring | Sentry |
| Billing | Razorpay (India) |

Fine to share at this level: model and vendor names are normal to disclose. Don't
share prompts, code, or database design.

### Where it's hosted today (be accurate)
- **Vercel:** functions run in Vercel's default region, which is **US** unless
  changed. ⚠️ We're on the **Hobby (free) plan**, and Vercel's terms say Hobby is
  for **non-commercial use only**, so a paid pilot needs **Vercel Pro (US$20/mo)**.
- **Supabase:** **free tier**. *Check the project's region in the Supabase dashboard
  (Settings → General) before the call.* Free tier also has no daily backups SLA;
  production health data needs **Pro (US$25/mo)**.
- **Anthropic API, Deepgram, Recall.ai (us-east-1), Voyage:** all **US**.
- **Right answer to "where's the data?":**
  > "Today it's on US infrastructure (Vercel, Supabase, US AI APIs). For an
  > Australian pilot we'd deploy a separate instance with the database in Sydney
  > (Supabase ap-southeast-2), app functions in Sydney (Vercel syd1), and AI calls
  > through Australian endpoints, e.g. Claude via AWS Bedrock in the Sydney region,
  > so health data stays in Australia. That's a deployment change, not a rebuild,
  > because the app is cloud-native."
- **Speech-to-text is the hardest part to keep in Australia.** Deepgram is
  US-hosted (dedicated/self-hosted options exist, but they're enterprise-tier).
  Alternatives with Sydney regions are AWS Transcribe and Azure Speech. For a pilot
  of **typed and pasted notes**, no audio is recorded or transcribed at all (the typed
  text still goes to Kith's Australian instance for the AI), which is the
  simplest compliant starting point. Worth suggesting.

### Security details he might ask about
| Question | Honest answer |
|---|---|
| Encrypted? | Yes, in transit (TLS) and at rest (Supabase), plus app-level field encryption for sensitive fields. Not end-to-end. |
| Who can see data? | Row-level security: each practitioner sees only their own clients. Admin/service keys stay server-side only. |
| Audit log? | **Not yet.** NDIS/health buyers will want one (who viewed or edited what, when). Pilot to-do. |
| Certifications? | None yet (no ISO 27001 / SOC 2 / pen test). Plan: Essential Eight self-assessment + privacy impact assessment for the pilot; certification later if it scales. |
| Vendor agreements (DPAs/BAAs)? | Not yet signed with AI/speech vendors. Needed before real client data. |
| Backups / uptime? | Free tiers today. Pilot needs paid tiers with backups. |
| Do you train AI on our data? | No. Anthropic's API doesn't train on API data by default. Say "we don't train models on client data." |

### Cost of making it AU-pilot-ready (rough, for your own planning)
- Vercel Pro ~US$20/mo + Supabase Pro ~US$25/mo, in Sydney regions.
- AI usage: cents per note; small for a 5–15 user pilot.
- Engineering: AU deployment, audit log, org/team accounts, NDIS templates.
  This is most of the 4–6 week estimate.

---

## 3. Questions Steve will probably ask, with suggested answers

### About you and Kith
**Q1. Tell me about yourself / why you built Kith.**
> Data engineer by background (Samsung R&D), built Kith because therapists spend
> hours on documentation. Built it end to end myself; it's live and working.
> *(Adjust to what you're comfortable sharing.)*

**Q2. What traction do you have?**
> "Honestly, none commercially yet. The product is live and billing works, but
> we haven't cracked distribution, and that's the gap I'm looking for a partner to
> fill. I'd rather tell you that now than oversell."
*(He already praised your honesty. Stay consistent.)*

**Q3. Why Australia / why NDIS, when you're in India?**
> "The problem is the same everywhere: practitioners drowning in notes. You know the
> AU market and NDIS; I have the engine. NDIS has strict, auditable documentation
> rules, and a tool that's built for those rules is easier to sell."

### Product and technology
**Q4. Can Kith turn raw support-worker notes / voice memos into structured case notes?**
> "Yes. That's the core of what it does. Typed rough notes → structured note works
> today; I'll show you in a follow-up demo. Voice → transcript → note works for sessions.
> For NDIS we'd add the right templates: goal-linked progress notes, incident drafts,
> and missing-information flags."

**Q5. How accurate is it? What about hallucinations?**
> "Two safeguards. A two-stage pipeline repairs unclear words from context before
> the note is written, and every note is a draft a human reviews and signs off. We
> deliberately don't let the AI invent numbers or diagnoses. We stripped those out."

**Q6. What AI models / tech stack do you use?**
> "Anthropic's Claude models for note generation, Deepgram for speech-to-text,
> Next.js on Vercel, Supabase Postgres." *(High level is fine. Don't share code or prompts.)*

**Q7. How does Kith complement what C51 has (NDIS Documentation Assist)?**
> Turn it back to him: "Can you walk me through what it does today and who's using
> it? Then we can see where Kith's engine fits: production-grade transcription,
> the note pipeline, security, multi-user access."
*(This is the most important thing to learn on the call. Let him talk.)*
- **Trust test (decided 2026-10-18):** don't mention that we've seen his "NDIS
  Documentation Assist" demo. Ask openly ("what has C51 built so far?") and see
  whether he volunteers it. If he describes it openly, that's a good sign. If he
  avoids it or plays it down, that's a yellow flag. Note which happened in the
  call notes. Don't bring it up yourself on this call.

**Q8. How long would it take to build an NDIS pilot version?**
> Don't give a firm number. "Depends on the workflow we pick. Once we've talked
> to the pilot org and know their exact templates, I'll send a scoped plan with a
> timeline within a few days."

**Q9. Can it integrate with ShiftCare / Brevity / [their platform]?**
> "Not today. For a pilot we'd keep it standalone: support workers paste notes or
> record, then copy or export the finished note. Integration comes later if the
> pilot works."

**Q10. Does it support multiple staff under one organisation?**
> Today it's per-practitioner accounts with strict data separation. Organisation-
> level team accounts and an admin view would be part of the pilot build.
> *(Plans mention admin features, but they aren't built. Don't claim they are.)*

### Security and compliance (he flagged "appropriate security foundations")
**Q11. Is it secure and compliant enough for Australian health data?**
> "Foundations yes: encryption in transit and at rest, field-level encryption,
> strict per-user access control. For Australia specifically, we'd move hosting and
> AI processing to Australian regions so health data doesn't leave the country
> (Privacy Act / APP 8), and do a privacy impact assessment for the pilot. That's
> scoped, doable work. I'd rather plan it properly than claim it's done."
- Know these terms: **Privacy Act 1988 / APPs** (APP 8 = sending data overseas),
  **Notifiable Data Breaches scheme**, **NDIS Practice Standards** and audits,
  **consent to record** (most states need everyone's consent), **Ahpra AI
  guidance** (practitioner must review notes, get informed consent).
- **TGA:** a note tool must not suggest diagnoses or treatments, or it risks being
  regulated as a medical device. Kith documents; it doesn't diagnose. Say this.

### Delivery and team
**Q12. Who's on the team? Can you commit to delivering?**
> "I'm a solo founder, building Kith alongside my full-time role. Everything you'll see
> I built myself, and AI-assisted development lets me move fast. For a scoped pilot
> I can commit 15–20 hours a week. For a tightly scoped single workflow, that's
> roughly 4–6 weeks to a pilot-ready version, and I'll confirm a realistic timeline
> once we know the exact workflow. If the pilot turns into real revenue, I'll scale
> my time and the team up with it."
- Say **15–20**, not 25: under-promise and over-deliver.
- Why this works: it's honest (he values that), it shows output (a live product
  built solo), and it ties more commitment to real results, which is fair in a
  shared-upside deal.
- Before signing anything, check your employment contract for moonlighting/IP clauses.

**Q13. Can you support customers in Australian hours?**
> AEDT is IST + 5.5h, so your morning is their afternoon. Real overlap exists
> (roughly 9am–1pm IST = 2:30–6:30pm AEDT). Note: India-based support staff
> accessing AU data also counts as an overseas disclosure, which needs to be in
> the privacy policy.

### Partnership and commercials
**Q14. What do you want out of this partnership?**
> "A real market and real customers for the engine: revenue, a reference
> customer and a long-term partner. I'm flexible on structure as long as both
> sides have clear commitments."

**Q15. What do you expect from me / C51?**
> "Market knowledge, the right pilot organisation, an intro, help shaping the
> product for NDIS, and owning the commercial conversations in Australia."

**Q16. Who owns the IP?**
> "Kith's core engine stays Kith's; that's what I bring. Anything specific we
> build together for this market, I'm open to working out fairly. Let's settle the
> structure once the pilot scope is clear."

### If money comes up: principles yes, numbers no (see `money-plan.md`)
> "My thinking is simple: no upfront fees either way, revenue share on what customers
> actually pay, and Kith invoices the customer and pays C51 its share, so the money flow
> is clean and transparent for both of us. Let's put the actual split in the heads of
> agreement once we know the pilot scope."

---

## 4. Questions YOU ask him (pick the top 5–6; time is short)

1. **What does NDIS Documentation Assist do today?** Any users, pilots or feedback?
2. **Which provider(s) are you thinking of for the pilot?** How do you know them? Can
   you introduce us before we build anything?
3. **What did C51 learn from exploring this market?** The biggest pain points, what
   providers said they'd pay for.
4. **What does a successful pilot look like to you?** Users, weeks, outcome.
5. **How do you see the roles split day to day?** Who talks to the customer, who
   supports them?
6. **Which legal entity would we partner with?** (KAPAGI Consulting Pty Ltd?) Who are
   the directors?
7. **Have you done partnerships like this before?** Anyone we could speak to?

---

## 5. Things to know (cheat sheet)

| Term | Meaning |
|---|---|
| **NDIS** | National Disability Insurance Scheme: government funding for disability supports |
| **Participant** | Person with a disability receiving NDIS supports |
| **Support worker** | Provides day-to-day support; writes shift/progress notes |
| **Progress / case notes** | Record of each shift or session. Must link to the participant's **goals**; auditors penalise task-only notes ("helped with shopping") |
| **Incident report** | Must reach the NDIS Commission within **24h** for reportable incidents, with a follow-up within 5 business days |
| **Restrictive practices** | Restraint and similar; reported monthly; very sensitive |
| **SIL** | Supported Independent Living. Providers had to register by 1 Oct 2026, so many face their first audits |
| **NDIS Practice Standards** | The audit rules providers are checked against |
| **Allied health** | Psychologists, OTs, speech therapists; Kith's current home turf |
| **Plan reassessment report** | Long report allied-health practitioners write (2–4h each), billable at about A$184–253/h |

**Competitors he may mention:** ShiftCare (already has AI notes, A$9–25/user/mo),
Splose, CordoCare, KoalaOne (AI notes), Heidi Health, Lyrebird (AI scribes);
Brevity, SupportAbility, CareMaster (no AI, which is the opening).
**Our angle:** a tool that sits alongside whatever platform they use, is goal-linked
and audit-ready, and keeps a human in charge. We don't try to replace their whole system.

---

## 6. Red lines on this call
- No commitment to build, timelines, fees or exclusivity.
- No source code, prompts, or detailed architecture sharing.
- Don't claim certifications, AU hosting, team size, customers or features we don't have.
- Don't run the online meeting bot on this call. Don't record the call without asking.

## 7. After the call (same day)
- Write call notes in `call-notes/2026-10-20.md`: what he said about his product,
  pilot org, roles, next steps.
- Send a short thank-you plus a recap of agreed next steps.
- Update `timeline.md` and `decisions.md`.
