# Kith Workspace (generic, Australia-hosted): scope & build plan

Drafted 2026-10-21 after the call with Steve Agi (not recorded). Target: a working
version emailed to Steve in **2–3 days**.

## What Steve wants (from Anurag's read of the call)
Kith as a **generic AI note-taker**, not a therapy tool: any professional records or
types, picks what kind of note they want, and gets a clean, field-appropriate note,
then can search and ask questions across their notes. Hosted in Australia.

## What we know about Steve's world (research, `partnerships/steve-agi-c51/research/`)
- Background: 25 years in **hospitality** (Cafe 51 / #burgerlove), retail, marketing.
- C51's current target sectors (relaunched Aug 2026): **aged care & healthcare, NDIS &
  community services, local councils, multi-site businesses, agriculture**.
- His demo portfolio: NDIS Documentation Assist, FoodSafe LIMS (food safety), Retail
  Rewards OS, Membership Admin. Admin-automation for operators.
- Anurag's own call notes add: **pharma, construction, medical**.
→ He'll test it as a general operator, then picture it in front of NDIS/aged-care
  providers, councils and multi-site operators. The field list must cover these.

## Product: what's IN (everything else is removed)

### 1. Sign-in + onboarding (one screen, under 30 seconds)
- Sign-in: **email magic link** (no password) + "Continue with Google". *(decision Q3)*
- Onboarding fields: **Name**, **Email** (prefilled from sign-in), **Phone (optional)**,
  **Field** dropdown:
  - **General (default)**: totally generic notes
  - Healthcare / medical, Pharma, Construction, NDIS & disability support, Aged care,
    Allied health & therapy, Hospitality & food service, Retail & multi-site operations,
    Local government / councils, Agriculture, Legal, Sales & client meetings,
    Education, Real estate & property
  - **Other: type your own** (free text, e.g. "mining safety officer")
- Optional one-liner: "Anything about how you like your notes?" (skippable).
- For "Other", the AI writes a **field profile** once (vocabulary, what matters,
  typical note structure) and stores it, so every later note uses it.

### 2. New note (the home screen)
- Big **note type** selector with a **pre-selected default** (from the user's field).
  Type list = generic types + field-specific ones, e.g.:
  - Generic (all fields): **General notes (default)**, Meeting minutes, Client / stakeholder
    call, Interview, Daily log / handover, Incident report, Custom ("describe the note you want")
  - Medical: Consult note (SOAP), Referral letter, Clinical handover
  - Pharma: HCP call note (rep visit), Medical-science-liaison interaction,
    **Adverse-event capture** (flags possible AEs for reporting; never assesses causality)
  - Construction: Site inspection / walkthrough, Toolbox (safety) talk, Daily site diary,
    Defects / punch list
  - NDIS: Shift / progress note (goal-linked), Incident report (24 h flag)
  - Aged care: Care note, Shift handover
  - Hospitality: Shift handover, Food-safety check, Supplier meeting
  - Councils: Community consultation minutes · Agriculture: Farm inspection log
- Then **Record** (live transcript on screen) or **Type / paste** rough notes.
- One-tick consent before the first recording: "Everyone being recorded has agreed."

### 3. The note
- Generated in about 10–20 s, with progress shown. Generic shape for every field:
  title, summary, **sections** (headings depend on field + note type), **action items**
  (task / owner / due), decisions, follow-ups, **flags** (safety, incidents,
  adverse events, compliance: flagged for a human, never decided by the AI), tags.
- Edit in place, copy, export (PDF + copy-as-text), delete.
- AI rules: only uses what was said or typed; missing info flagged, never invented;
  **no diagnosis or treatment advice** in any field (TGA).

### 4. Notes list + "Ask your notes" (RAG)
- Notes list: fast, searchable (hybrid keyword + semantic, already built in Kith).
- **Ask**: a question box. Retrieves the most relevant notes, then Claude answers
  **with citations** linking to the source notes ("What did the client say about the
  deadline last week?", "List all open action items for Site B").

### 5. How notes adapt to the person
- Prompt = base engine + **field profile** + **note-type template** + user preferences.
- Learns over time: when the user edits a generated note, we store the edit, and the
  last few edits are added to future prompts as style examples.

## Product: what's OUT
Patients, appointments, calendar sync, insights, billing/plans, settings sprawl,
reminders, online meeting bot (Recall), blog/marketing pages, risk banners, therapy-specific
formats. **The existing therapist product at kith.space is left untouched.**

## Architecture (recommended)
- **New edition in the same repo**: new route group `app/(workspace)/` + `lib/workspace/`,
  switched on with `NEXT_PUBLIC_EDITION=workspace`. Reuses Kith's proven parts (Supabase
  auth, the Deepgram live-transcription hook, the Claude client, embeddings, encryption)
  without the therapy baggage.
- **Separate deployment**: new Vercel project, functions in **Sydney (syd1)**, on its
  own subdomain (e.g. `au.kith.space`). *(decision Q1/Q4)*
- **New Supabase project in Sydney (ap-southeast-2)** with a fresh, simple schema:
  - `profiles`: user_id, name, email, phone, field, field_custom, field_profile (AI),
    note_preferences, default_note_type, created_at
  - `notes`: id, user_id, title, note_type, field, input_mode (record/typed),
    transcript (encrypted), typed_input (encrypted), content jsonb (sections, actions,
    flags…), summary, status, embedding vector(1024), search_text, tsv, timestamps
  - `note_edits`: note_id, user_id, before/after (for style learning)
  - RLS: every row scoped to its owner.

## Australian hosting: honest status
| Piece | Plan | Who / what's needed |
|---|---|---|
| Database + auth + storage | New Supabase project, **Sydney** | Anurag creates it (5 min), pastes keys |
| App / API functions | Vercel project, region **syd1** | Claude configures; ⚠ Vercel Hobby is non-commercial only, so Pro (US$20/mo) is needed before real customers |
| Note AI (Claude) | **AWS Bedrock, Sydney** (Claude models available there) | Needs an **AWS account** + Bedrock model access *(decision Q2)*. Fallback: Anthropic API (US) for the demo, clearly labelled |
| Speech-to-text | Deepgram is US-only on standard plans. AU option: **AWS Transcribe streaming, Sydney** | Needs AWS. Fallback: Deepgram (US) for the demo; typed notes have no audio at all |
| Embeddings (RAG) | Voyage is US. AU option: **Bedrock Titan Embeddings v2 / Cohere Embed, Sydney** (1024-dim, same schema) | Needs AWS. Fallback: Voyage (US) |

With an AWS account, **everything** runs in Sydney. Without one, data at rest and the
app are in Sydney, but AI/speech calls go to the US. That's fine for a demo if we say
so plainly.

## Speed / polish requirements
- Lean pages: server components, no heavy dashboard shell, instant route prefetch.
- Every click gets visual feedback in under 100 ms (optimistic UI, skeletons, no blocking spinners).
- Note generation streams progress; the list updates without a full reload.
- Mobile-friendly (support workers are on phones).
- Lighthouse-style check before sending; no console errors; tested on Chrome desktop + mobile.

## Build plan (2–3 days)
**Day 1**
- AU infra: Supabase Sydney project (Anurag), schema + RLS migration, Vercel project
  (syd1, env vars), subdomain.
- Edition switch + routing (non-workspace routes hidden in this edition).
- Sign-in (magic link + Google) and the one-screen onboarding with the field dropdown and "Other".
- Field registry + note-type registry (`lib/workspace/fields.ts`, `note-types.ts`).

**Day 2**
- New-note screen: type selector with default, Record (reuse the Deepgram hook) / Type.
- Generic generation pipeline (`lib/workspace/generate.ts`): field profile + template →
  structured JSON → render; AI field-profile generation for "Other"; edit + style learning.
- Notes list + detail (edit / copy / PDF / delete) + hybrid search.
- "Ask your notes" RAG with citations.

**Day 3**
- AU AI switch: Bedrock (Claude + embeddings) and AWS Transcribe if AWS is ready.
- Speed pass, mobile pass, empty states, error states.
- End-to-end QA in every field with real recordings and typed notes.
- Demo account seeded with realistic sample notes (construction / NDIS / pharma).
- Email to Steve: link, 3-step "try it" guide, what's in Australia today vs next, and
  what we'd like his feedback on.

## Decisions (made 2026-10-21)
1. **Separate AU edition** ("Kith Workspace"), same repo, own Sydney DB + Vercel project.
   kith.space untouched.
2. **No AWS for now.** Database, auth and app in Sydney; AI (Anthropic), speech
   (Deepgram) and embeddings (Voyage) stay on US providers for the demo, **stated plainly
   to Steve**. Code keeps a provider switch so Bedrock/Transcribe (Sydney) can be flipped on later.
3. **Sign-in: magic link + Google.** Magic-link emails go through Resend (custom SMTP)
   because Supabase's built-in mailer is heavily rate-limited.
4. **Address: work.kith.space.**

## Before sending to Steve (protect the IP)
- Steve gets a **user account**, not code or admin access.
- Mutual NDA ideally signed before or with the link (we drafted that as a next step).
- Terms/privacy page for the new edition (short, AU Privacy Act aware).
