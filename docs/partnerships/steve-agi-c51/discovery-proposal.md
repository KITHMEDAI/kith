# NDIS documentation workflow: discovery + prototype

**Kith × C51: proposal for the smallest credible discovery (draft, 25 Oct 2026)**

## Goal

In 4 weeks, with one NDIS provider, find out whether AI-assisted shift and progress notes:
- save support workers real time
- produce notes the provider would sign off for audit
- meet the provider's minimum security and compliance bar

The result is a clear **go / no-go decision on a paid pilot**, with numbers behind it.

## Starting point

This isn't a build from zero. Kith Workspace is already live and working (Sydney-hosted):

**What it does**
- Three input methods: speak, record a meeting, or type / paste.
- Structured notes, including an NDIS progress-note template and an incident-report template (with NDIS / aged-care SIRS prompts).
- "Ask your notes", answering only from the user's own notes.

**Security in place**
- Data stored in Sydney.
- All note text encrypted.
- Per-user isolation.
- Rate limits.
- Privacy Policy and Terms.
- An automated security test suite (69 checks, all passing).

So the discovery money goes into **fitting one real workflow and proving it**, not into building the basics.

## Work breakdown

| Week | Work | Who | Output |
|---|---|---|---|
| **1. Discover** | Kick-off with the provider's operations/compliance lead. Interview 2–3 support workers. Collect their current note templates and 5–10 de-identified sample notes. Map the workflow (capture → review → store → audit). List their documentation obligations: progress notes, incident and reportable-incident handling, record keeping. Run a short security and procurement questionnaire | Kith (technical), C51 (sessions, commercial questions) | 2-page **workflow and requirements brief**, agreed with the provider |
| **2. Configure** | Set Kith up for that workflow: the provider's own progress-note format and wording, incident flags (prompt when something may be reportable), a mandatory human review / sign-off step, and the export format they need (PDF / text / CSV, ready to paste into their system). Create accounts for 3–5 workers | Kith | **Working prototype** on their workflow |
| **3. Prove** | 3–5 workers use it on real shifts for 1–2 weeks, with their usual review process. Kith supports them and fixes issues quickly. In parallel, write the **security and compliance pack** (below) | Kith, provider staff; C51 tracks feedback | Usage data plus the security pack |
| **4. Decide** | Measure time per note (before vs after), how much reviewers had to edit, reviewer quality scores and worker feedback. Write the go / no-go report: pilot scope, pricing, rollout plan and costed next steps (e.g. integration with their system, AI processing moved to Australian regions) | Kith (data, technical), C51 (market and commercial assessment) | **Go / no-go report** |

**Security and compliance pack** (delivered in week 3):
- Data residency and the data-flow diagram.
- Encryption and access controls.
- Retention and deletion.
- Incident / breach process.
- Privacy Policy and Terms.
- Draft data processing agreement.
- AI processing disclosure: transcription and note writing currently run on US providers, with model-training opt-outs. The cost of moving to Australian-region AI is included.
- Our security test results.

## Responsibilities

| Kith | C51 | Provider |
|---|---|---|
| All technical work, configuration, hosting and AI costs during discovery, security pack, support, measurement | Introduce the provider, run the commercial and market assessment, help with stakeholder sessions, validate pricing and positioning | Give access to 3–5 workers and an ops/compliance lead, share templates and de-identified samples, give feedback, fund the discovery |

## Timeline

**4 weeks from kick-off**, Kith working part-time (10–15 h/week), with fast turnaround on issues during the trial week(s). Can start within a week of agreement.

## Cost

- **A$4,500 (ex GST), fixed price, funded by the pilot provider.**
- Invoiced by Kith: **50% at kick-off, 50% on delivery of the go / no-go report**. C51's share of the fee is as agreed between Kith and C51.
- Hosting and AI usage for the discovery are included.
- **Not included** (each one is costed in the report if the provider wants it):
  - Direct integration with their care-management system (e.g. ShiftCare API).
  - Moving AI processing to Australian regions.
  - Features beyond configuring the agreed workflow.

## Ownership and terms (to confirm in a short written agreement before starting)

- Kith keeps ownership of its platform and code. The provider owns its data and notes. C51 owns its market and commercial materials.
- The provider's data is used only for this discovery, kept in Sydney, and deleted or returned at the end if there's no pilot.
- If the decision is "go", the pilot is priced and agreed separately.
