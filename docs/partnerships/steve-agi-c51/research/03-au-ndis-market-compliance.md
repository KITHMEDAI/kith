# 03 - Australian NDIS / Allied Health Market & Compliance Briefing

**Prepared for:** Anurag (Kith), ahead of the partnership call with Steve Agi (C51 / AGI360)
**Date:** 2026-10-18
**Method:** Public web sources only (WebSearch / WebFetch). Many sources are vendor marketing or law-firm summaries; confidence is flagged inline. **This is not legal advice.** Before signing a pilot contract, have an Australian privacy lawyer review the data-flow and consent design.

Confidence legend: **[V]** verified from an official/primary source · **[S]** secondary source (law firm, trade press, vendor) · **[U]** uncertain / my inference / needs checking

---

## TL;DR (read this if nothing else)

1. **The pain in NDIS is volume and compliance, not clinical depth.** A 100-participant provider may produce 600-800 progress notes a week [S, ShiftCare]. Auditors flag notes that list tasks but don't link to participant goals, plus incident follow-up that is inconsistent [S]. Reportable incidents have **24-hour** and **5-business-day** clocks [V].
2. **The incumbents already ship "AI notes".** ShiftCare (voice-to-text, a "Note Coach", risk flags), Splose (AI notes and NDIS reports for allied health), CordoCare, KoalaOne, plus the scribes Heidi and Lyrebird. A generic "AI progress note" feature is **not** a wedge. The opening is in **narrow, compliance-heavy outputs** the platforms do badly: NDIS plan-reassessment and progress reports for allied health, goal-linked note quality checks, and incident narratives drafted to the NDIS Commission's structure.
3. **What the law requires vs what buyers expect.**
   - Legally required: Privacy Act + APPs (health providers are covered whatever their turnover), the Notifiable Data Breaches scheme, APP 8 accountability for sending data overseas, state health records acts (Vic / NSW / ACT), surveillance-device consent laws for recording, and Ahpra's professional obligations for registered practitioners.
   - Typical buyer asks: AU data residency, ISO 27001 or SOC 2, Essential Eight maturity, a pen-test report, and a no-training-on-data clause.
4. **Kith's biggest single compliance gap for AU is the LLM call, not the database.** Supabase (ap-southeast-2) and Vercel (syd1) can both sit in Sydney. Any transcription or LLM inference sent to US endpoints is a cross-border disclosure under APP 8. Fix: use an AU-region inference endpoint (e.g. Claude via Amazon Bedrock with the "au" geo profile, which routes between Sydney and Melbourne [S/U]) and an AU-region speech-to-text provider.
5. **TGA risk.** The TGA found 8 of 12 AI scribes reviewed likely meet the definition of a medical device, because they suggest diagnoses or treatments. As of 2026 the TGA has moved to compliance action [S]. Kith should **not** propose diagnoses or treatment. Keep it a documentation and summarisation tool, and say so in the intended-purpose statement.
6. **Pilot shape to propose:** 8-12 weeks, one organisation, 5-15 users, one workflow, AU-hosted. Make it **paid but discounted** (e.g. A$1.5k-5k total, or A$30-60 per user per month), with success metrics agreed up front (minutes saved per note or report, audit-readiness score, user retention).

---

## 1. NDIS documentation reality

### 1.1 Regulatory frame
- **NDIS Practice Standards and Quality Indicators** (core module plus supplementary modules) apply to registered providers. They include modules on high-intensity daily activities, behaviour support, early childhood, and specialist support coordination. Restrictive-practice sections cover monitoring and reporting, behaviour support plan review, and interim plans [V-ish: we only accessed the contents page].
  https://ndiscommission.gov.au/sites/default/files/2024-10/ndis-practice-standards-and-quality-indicators.pdf
- **2026 reforms:**
  - Amendment Rules commenced 1 July 2026.
  - Registration is now mandatory for Supported Independent Living (SIL) and digital platform providers. Unregistered SIL providers had to apply by 1 October 2026.
  - A new **Module 5A (SIL Practice Standards)** covers supported decision-making, safeguarding, practice governance, and tenancy and support agreements.
  - Notification timeframes are shorter.
  - A broader rewrite of the Practice Standards into plain-language "Expectation Statements" is in consultation [S/V].
  - What this means: **a large cohort of newly registering SIL providers now faces its first audits.** That is a real buying trigger.
  - Sources:
    - https://www.ndiscommission.gov.au/sites/default/files/2026-06/Amendment-Explanatory-Document-PDF.pdf
    - https://www.ndiscommission.gov.au/sites/default/files/2026-02/Reg-Reform-Roadmap-Feb-2026-PDF.pdf
    - https://www.minterellison.com/articles/ndis-legislative-reforms-mandatory-registration-and-new-access-rules

### 1.2 What registered providers must document

| Record | What's required | Notes / source |
|---|---|---|
| **Progress / case notes** | A record of each support delivered: date, time, worker, what was done, and the participant's response and progress toward goals. | Auditors penalise task-only notes and notes not aligned to goals; they expect notes to be prompt, objective and factual [S]. https://romeohr.com/blog/ndis-documentation-your-year-round-audit-compliance-guide |
| **Service agreements** | Agreement with each participant covering supports, prices and terms. SIL now also needs clear tenancy and support agreements (Module 5A). | [S/V] |
| **Support / care plans and goals** | Person-centred plans linked to NDIS plan goals; reviewed regularly. | [S] |
| **Incident records and reportable incidents** | An incident management system proportionate to the provider's size. **Reportable incidents** (death, serious injury, abuse or neglect, unlawful sexual or physical contact, sexual misconduct) go to the Commission **within 24 hours**, using the Immediate Notification Form. A follow-up 5-day form is due **within 5 business days**. Unauthorised restrictive practice must be reported within 5 business days, or 24 hours if it caused harm. Late reporting is a contravention of the NDIS Act. | [V] https://www.ndiscommission.gov.au/rules-and-standards/reportable-incidents-and-incident-management/reportable-incidents and https://ndiscommission.gov.au/sites/default/files/2024-09/detailed-guidance-incident-management-systems-detailed-guidance-regi-20240926.pdf |
| **Restrictive practices** | Only where authorised under state or territory law and included in a behaviour support plan. Implementing providers file **monthly reports** on every regulated restrictive practice in the plan, including nil use, **within 5 business days of month end**. PRN (as-needed) uses are reported each time. | [V] https://www.ndiscommission.gov.au/rules-and-standards/behaviour-support-and-restrictive-practices/rules-implementing-providers |
| **Behaviour support plans** | Developed by a registered behaviour support practitioner and lodged in the NDIS Commission Portal. An interim plan is due within 1 month and a comprehensive plan within 6 months [U: timeframes from memory; verify]. | [S/U] |
| **Worker screening, training, complaints, risk registers, consent forms** | Required evidence at audit. | [S] |
| **Retention** | Commonly cited as **7 years**. ShiftCare says that from 27 Aug 2026, payment and receipt records must be kept 7 years. Behaviour-support sources cite 7 years for adults, or until age 25 for minors [S/U, verify against the Act and Rules]. | |

### 1.3 Allied health (psychology, OT, speech, physio)
- **Clinical notes** are required by each Board's code of conduct and the state health records acts.
- **NDIS-specific reports:**
  - Plan reassessment and progress reports to the NDIA must cover:
    - service details
    - goals
    - baseline functional capacity
    - **assessment tools used**, e.g. TUG, 6-minute walk test, Berg
    - progress against goals [V] https://www.ndis.gov.au/providers/working-provider/allied-health-providers/plan-reassessment-reports
  - Functional Capacity Assessments (FCAs) are lengthy. Vision Australia calls them "over-utilised", costly and time-consuming [S].
  - A vendor estimates **2-4 hours per plan-reassessment report** (3-6 pages) [S, vendor estimate].
  - Report writing is **billable** under the NDIS "non-face-to-face" item for each discipline [S]. Selling point: Kith time savings either free up clinician hours or reduce the cost to participants' plans.
- **2026-27 NDIS hourly price limits** (from secondary sources; verify against the NDIA Pricing Schedule) [S]:
  - Psychology A$252.99
  - OT and speech A$193.99
  - Physio A$183.99
  - Sources: https://daar.com.au/resources/ndis/ndis-pricing-guide/15_054_0128_1_3 and https://ndsp.com.au/blog/ndis-news/ndis-pricing-schedule-2026-27-key-changes-explained/
- **Public-sector allied health validation:** a Gold Coast Health evaluation across 10 allied health professions (97 surveyed) found clinicians supportive and documentation quality improved. Clinicians stressed the need to review AI notes [S]. https://www.mobihealthnews.com/news/anz/queensland-health-services-ai-scribe-saves-doctors-59-minutes-daily

### 1.4 Aged care (brief)
- The **new Aged Care Act 2024** and **Strengthened Aged Care Quality Standards** commenced **1 November 2025** [V].
  - Each standard is structured as intent, expectations, outcomes and actions.
  - Graded audits are rolling out over about 3 years [S].
  - https://www.health.gov.au/resources/publications/strengthened-aged-care-quality-standards
  - https://www.rsm.global/australia/insights/new-era-aged-care-australia-understanding-2025-aged-care-act
- Many NDIS platforms (ShiftCare, Lumary, CareMaster) serve both sectors.
- **Recommendation:** aged care is a later expansion, not the pilot. It has larger buyers, heavier procurement, and incumbent clinical systems.

### 1.5 Pain vs AI-suitability matrix (my assessment) [U - judgment]

| Workflow | Pain (time/risk) | AI suitability | Competition | Comment |
|---|---|---|---|---|
| Support-worker shift progress notes | High volume, moderate per note | High (voice to structured note) | **Crowded** (ShiftCare, KoalaOne, every rostering platform) | Commodity. The rostering platform owns the workflow. |
| Goal-linked note quality and audit readiness | High: audit failures | High (check note vs goals) | Partial (ShiftCare "Note Coach", in beta) | Good wedge if delivered on top of the existing platform. |
| Incident narrative plus reportable-incident triage | Very high: 24h legal clock | Medium-high (draft and flag; a human decides) | Partial (ShiftCare risk flags) | High value, high liability. Must be strictly assistive. |
| Restrictive-practice monthly reporting | Medium (monthly, repetitive) | Medium (aggregate from notes) | Low | Niche but sticky for behaviour support or SIL providers. |
| Allied health NDIS progress / plan-reassessment reports and FCAs | **Very high** (2-4h each) | **High** (assemble from session notes and assessment scores) | Moderate (Splose; Heidi templates) | **Best fit for Kith's engine.** |
| Allied health session notes (psych / OT / speech) | High | High | **Crowded** (Heidi, Lyrebird, Splose, Perci, NovoNote, Halaxy) | Hard to win head-on. |
| Support coordination case notes | Medium-high (30-40 participants per coordinator) | High | Moderate (CordoCare at about A$25-38/user, KoalaOne) | Possible secondary wedge. |

---

## 2. Competitors active in Australia

### 2.1 NDIS / care management platforms

| Vendor | What it does | Pricing (public) | AI features | Gaps / notes |
|---|---|---|---|---|
| **ShiftCare** | Rostering, billing, progress notes, incidents; NDIS, aged care, home care | Essentials A$9, Growth A$15, Intelligence A$25 per user per month (min. 5 users); about 20% off annual [S] https://www.shiftcare.com/au/pricing | Voice-to-text notes, visit summaries, risk/incident flagging, "AI Completeness Coach / Smart Note Coach" (help-centre article says **closed beta**) [S] https://help.shiftcare.com/en/articles/11069117-ai-progress-notes | The most aggressive AI incumbent. Its AI is a bundled feature, not deep clinical reporting. Aimed at support workers, not clinicians. |
| **Brevity** | NDIS client management and billing for small and mid-sized providers | about A$6.49/client/month (Business, ex GST, setup fee) [S] | Not found | Per-client pricing; AI not visible. |
| **CareMaster** | NDIS/SIL operations | about A$15-16 / 26 / 36 per user per month (Essential / Standard / Premium) + onboarding package [S] https://caremaster.com.au/pricing | Not confirmed | |
| **SupportAbility** | Client management, support coordination, NDIS billing ("12M case notes recorded") | Not public | Not found | Large note volume, so a possible integration partner. |
| **Lumary** | Salesforce-based platform for larger NDIS and aged care providers; raised A$17M (OneVentures, Salesforce Ventures) | Not public (enterprise) | AI support-agent demo; no case-notes AI confirmed | Enterprise buyers, long sales cycles. |
| **CordoCare** | Support coordination and allied health | about A$25/user/month (promo; normally A$38) [S] | AI-assisted drafting with human review | Small. Close analogue to Kith. |
| **KoalaOne** | NDIS CRM | Not found | Voice-to-notes, incident and follow-up flags | |
| **Splose** | Allied health practice management (strong in NDIS therapy); raised about A$46-52M | Not captured | AI progress notes, **NDIS report writing**, voice summaries [S] https://splose.com/resources/the-handover/what-is-ai-clinical-documentation-and-how-is-it-transforming-allied-health | **Most direct threat to the report wedge** for allied health. |
| Others to note | Cliniko (no native scribe; Perci integration), Nookal, Halaxy (AI scribe), Flowlogic, CareVision, Astalty | | | |

### 2.2 AI scribes in Australia

| Vendor | Positioning | Pricing | Notes |
|---|---|---|---|
| **Heidi Health** (Melbourne) | Market-leading free-plus-paid scribe; GPs, specialists, allied health; NDIS templates (support-worker, case note) | Free / Clinician / Practice / Enterprise. Live AU pricing page shows no prices (fetched 2026-10-18). Third-party reports range from about US$110-150 per month for the Clinician plan; earlier cached AU figures were A$99-149/mo [S/U] https://www.heidihealth.com/pricing | Claims ISO 27001, ISO 42001, SOC 2, AU hosting [S]. Named in the TGA scribe review [S]. |
| **Lyrebird Health** | GP-focused; integrated into the Best Practice (Bp Premier) toolbar | Pro A$160/mo annual or A$240 monthly; Clinic from A$299/mo; Bp Free tier [S, vendor] https://www.lyrebirdhealth.com/au/blogs/ai-medical-scribe-cost | |
| **Perci** | Allied health scribe; Cliniko connected app; AU data storage; no training on data | Not captured | https://www.cliniko.com/connected-apps/perci |
| **NovoNote (NovoPsych), Halaxy AI Scribe, Grounded Scribe** | Psychology / mental health | | Psychology is a crowded segment. |
| **Tandem Health** | European; AU presence **not confirmed** [U] | | |
| **Dragon Medical One / DAX (Microsoft)** | Hospital enterprise | | Named in the TGA review. |
| **Public sector** | NSW Health is spending **A$38.7M** to roll out AI scribes to up to 6,000 clinicians (vendor TBD). Metro South Qld reports 59 minutes per day saved. SA is building "AU Scribe" in-house. | | Validates the category; not Kith's market. https://medicalrepublic.com.au/nsw-health-commits-38-7m-to-ai-scribes-for-up-to-6000-clinicians/126906 |

### 2.3 Gaps the competition leaves (where Kith could fit) [U - judgment]
- **Scribes** (Heidi, Lyrebird) are built for clinician consults. They don't know NDIS goal structures, the reportable-incident taxonomy, or restrictive-practice reporting, and they don't produce multi-session NDIS reports from longitudinal notes.
- **Care platforms** (ShiftCare and others) have AI that is shallow and bolted on. They target support workers and are tied to their own platform. Providers on Brevity, SupportAbility or CareMaster mostly have no AI.
- **A platform-agnostic "documentation engine"** could export into whatever system the provider already uses (PDF, DOCX or API). Sitting alongside the incumbent avoids a rip-and-replace sale.

---

## 3. Compliance and security for selling into AU health / NDIS

### 3.1 Legally required

| Requirement | What it means for Kith | Source |
|---|---|---|
| **Privacy Act 1988 + 13 APPs** | Health information is "sensitive information". **Health service providers are covered whatever their turnover**; the small-business exemption doesn't apply [V, general OAIC position]. As a vendor processing health info for providers, Kith will very likely be an APP entity itself. | https://www.oaic.gov.au/privacy/australian-privacy-principles |
| **APP 11 security** | "Reasonable steps" to protect the data. Encryption at rest plus field-level encryption is good evidence; also need access logging, MFA, and deletion/retention controls. | OAIC |
| **APP 8 cross-border disclosure** | Sending data to an overseas recipient (e.g. US LLM or speech-to-text APIs) makes the **AU entity accountable** for that recipient's breaches. Tranche 1 reforms (commenced 10-11 Dec 2024) added a "whitelist" mechanism, but no countries were prescribed as at last check [S/U]. | https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/sending-personal-information-overseas |
| **APP 6 secondary use** | No training on customer data without consent. For sensitive information, any secondary use must be directly related to the original purpose. OAIC AI guidance (Oct 2024) recommends against putting sensitive information into public generative AI tools. | https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products |
| **Privacy Act Tranche 1** | Statutory tort for serious invasions of privacy (in force), higher penalties, and **automated decision-making transparency** in privacy policies, commencing about **Dec 2026** [S/U on the exact date]. A Tranche 2 (e.g. removing the small-business exemption, a "fair and reasonable" test) is pending [U]. | https://www.hsfkramer.com/insights/2024-09/australian-privacy-reform-bill-tranche-1 |
| **Notifiable Data Breaches scheme** | Notify the OAIC and affected individuals of an "eligible data breach" (likely to cause serious harm) as soon as practicable; assess a suspected breach within 30 days [V, general]. **Health is the #1 breaching sector: 225 of 1,205 notifications (19%) in 2025** [V]. Expect buyers to ask for your breach response plan. | https://www.oaic.gov.au/news/media-centre/data-breach-notifications-increase-to-all-time-high-in-2025,-new-ndb-stats-show |
| **State health records acts** | Vic *Health Records Act 2001* (HPPs, incl. HPP 9 transborder), NSW *HRIP Act 2002* (15 HPPs, incl. HPP 14 transborder), ACT *Health Records (Privacy and Access) Act 1997*. These apply to private-sector providers in those states **in addition to** the Privacy Act [S; transborder HPP numbers from memory, verify]. | https://www.hpca.nsw.gov.au/resources/quick-guide-privacy |
| **Surveillance devices / listening devices laws** | Recording a private conversation without consent is an offence in most jurisdictions. NSW, WA, SA, Tas and ACT require consent from **all parties**; Qld, Vic and NT have a participant exception [S; sources conflict on NT]. Victoria also restricts *communicating* a recording, which is relevant to cloud upload. **Design rule: express, recorded consent before every ambient recording, in every state.** | https://hamiltonlocke.com.au/recording-private-conversations-the-law-in-australia/ |
| **Ahpra / National Boards** | "Meeting your professional obligations when using AI in healthcare" (Aug 2024). Practitioners stay accountable, must understand the tool, should be transparent and get **informed consent** (that it is a summary, not a transcript), and must review outputs. This binds the **clinician**, but buyers expect the product to make compliance easy (consent capture, review-before-sign). | https://www.ahpra.gov.au/Resources/Artificial-Intelligence-in-healthcare.aspx ; https://avant.org.au/resources/ai-scribes-and-patient-consent |
| **TGA (Therapeutic Goods Act)** | A scribe that suggests diagnoses or treatments may be **medical device software** needing ARTG inclusion. The TGA found 8 of 12 scribes likely in scope, and in 2026 moved to compliance action [S]. **Kith must not generate diagnoses or treatment recommendations**; keep the intended purpose to documentation and summarisation. | https://www.medicalrepublic.com.au/tga-flags-compliance-action-on-ai-scribes-as-review-finds-safety-concerns/127888 ; https://www.minterellison.com/articles/tga-publishes-findings-on-ai-and-medical-devices |
| **NDIS Commission obligations (provider-side)** | Records, incident management, restrictive-practice reporting and worker screening are the **provider's** obligations. Kith supports them but doesn't take them on. The Commission has published no AI-specific rule that we found [U]. A human must decide reportability. | §1.2 sources |

### 3.2 Typical buyer expectations (not law, but they will ask)

| Ask | Reality for a small vendor | Kith status / action |
|---|---|---|
| **AU data residency** | Not strictly legal for private providers (APP 8 allows offshore with accountability), but it is an **expected default**. Competitors (Heidi, Perci) market AU hosting. | **Supabase: Sydney region (ap-southeast-2) available** [V] https://supabase.com/docs/guides/platform/regions. Caveat: Supabase says data is **not guaranteed** to stay in-region; logs go to EU data centres and storage may be CDN-cached [V] https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq. **Vercel: syd1 = ap-southeast-2** for functions [V] https://vercel.com/docs/regions, but there is no general Vercel residency guarantee [U]. **The LLM and speech-to-text calls are the real gap**: Claude on Amazon Bedrock offers an "au" geo profile (Sydney + Melbourne) [S] https://aws.amazon.com/blogs/machine-learning/introducing-amazon-bedrock-cross-region-inference-for-claude-sonnet-4-5-and-haiku-4-5-in-japan-and-australia/. Azure OpenAI in Australia East is an alternative [U]. **Action: a written data-flow diagram showing every sub-processor and region.** |
| **ISO 27001 / SOC 2** | Enterprise buyers and larger NDIS orgs ask. Small providers usually accept a security questionnaire. | Not held. Say "in progress / roadmap" honestly. A compliance-automation tool (Vanta/Drata-type) plus SOC 2 Type I typically takes 3-6 months [U]. **Leverage: the partner (C51) may own this.** |
| **Essential Eight maturity** | Australian government baseline; increasingly asked by government-adjacent buyers. Buyers ask for a stated maturity level, not a certificate [S]. | Self-assess against Maturity Level 1-2 for your own corporate environment (MFA, patching, backups, admin privileges). |
| **Penetration test** | Commonly requested by contract; not universally mandated [S]. | Budget about A$5-15k for a web-app pen test before or during the pilot [U, typical market range]. |
| **Security questionnaire / vendor risk assessment** | Near-certain for any registered provider with a governance function. | Prepare a standard pack: encryption, access control, sub-processors, breach plan, retention, deletion, BCP. |
| **DPA / contract terms** | No training on data, deletion on termination, breach notice within 24-72h, AU law governing. | Draft a template DPA. |
| **Consent workflow & human review** | Expected because of Ahpra and surveillance laws. | Build: per-session consent capture plus audit log, "draft" status until clinician sign-off, and no auto-submission of incidents. |
| **Integration** | Providers won't double-enter. | Minimum: export to PDF/DOCX and copy-paste. Ideal: an API or integration with ShiftCare / Splose / SupportAbility [U on their partner APIs]. |

### 3.3 Specific risk for Kith: Indian founder, offshore access [U]
Support or engineering access from India to AU-hosted health data is itself a potential **APP 8 disclosure** (it counts as overseas access to the data). Mitigations:
- Field-level encryption, with keys not readable by support staff.
- Access logging.
- Contractual commitments.
- Disclosure in the privacy policy.
- Possibly an AU-based entity or partner (C51) as the contracting party.

Raise this with Steve directly, because it shapes the commercial structure.

---

## 4. Pilot economics

### 4.1 Price anchors in market (AUD, ex GST)
- **Care-management platforms:** A$9-36 per user per month (ShiftCare, CareMaster) or about A$6.50 per client per month (Brevity).
- **Support coordination tools:** about A$25-38 per user per month (CordoCare).
- **Clinician AI scribes:** A$0 (free tiers) up to about A$100-240 per clinician per month (Heidi, Lyrebird).
- **Implication:**
  - For **support workers**, the bundled-AI price is effectively about A$0-15 per user on top of the platform. Kith cannot charge scribe prices for shift notes.
  - For **allied health clinicians**, A$60-150 per clinician per month is supportable, because one plan-reassessment report (2-4h at A$190-250/h of billable time) is worth A$400-1,000 [S/U, derived].

### 4.2 Realistic pilot design [U - judgment, informed by public pilots]
- **Public benchmarks:**
  - Metro South Health: 70 clinicians.
  - A 5-week multi-hospital trial.
  - Cabrini ED: 12 months.
  - Gold Coast allied health: about 100 clinicians surveyed.
- Those are enterprise-scale. For one NDIS or allied-health org:

| Parameter | Recommendation |
|---|---|
| Length | 8-12 weeks (2 weeks setup and consent/privacy review, 6-8 weeks live, 2 weeks evaluation) |
| Size | 5-15 users in one team or site; one workflow |
| Price | **Paid, discounted.** E.g. a fixed A$2-5k pilot fee (credited against year 1), or A$30-60 per user per month. Free pilots attract low commitment; a token fee filters for real buyers. Expect the buyer to push for free; a fallback is free, with a **pre-agreed conversion price and success criteria** |
| Success metrics | (1) Minutes per note or report, before vs after (time-in-motion on a sample). (2) % of notes meeting the goal-linkage / audit checklist. (3) Clinician edit distance or acceptance rate. (4) Weekly active users at week 8. (5) Zero privacy incidents |
| Preconditions | AU-hosted stack incl. LLM; DPA signed; privacy impact assessment (PIA) shared; consent scripts; pen test or at least an external vulnerability scan; named clinical lead on the provider side |
| Conversion | Pre-agree list price and a 12-month term on hitting metrics |

### 4.3 Revenue reality check
- A single 15-clinician allied health org at A$100 per user per month is about **A$18k ARR**.
- A 50-worker NDIS provider at A$15 per user per month is about **A$9k ARR**.
- The pilot's value is **the case study and the channel (C51)**, not the revenue.

---

## 5. Recommended wedge (2-3 workflows)

### Wedge A (primary): NDIS allied-health progress and plan-reassessment report generator
- **What:** turns a plan period's session notes, goals and assessment scores into a draft report in the NDIA's structure. The draft covers service details, goals, baseline vs current function, tools used, progress and recommendations, with the evidence cited back to the source notes.
- **Why it can win:**
  - Highest time cost per artefact (2-4h).
  - Billable time, so ROI is easy to show.
  - The NDIA format is public and stable.
  - It plays to Kith's existing therapist note engine.
  - Scribes don't do longitudinal multi-session synthesis well, and only Splose does it inside its own PMS.
- **Buyer:** paediatric and adult OT / speech / psychology practices with heavy NDIS caseloads, which are often on Cliniko, Nookal or Halaxy without native report AI.
- **Risk:** Splose (well funded). Heidi adding NDIS report templates.

### Wedge B: goal-linked progress-note quality and audit-readiness checker (works on top of any platform)
- **What:**
  - Ingests (or drafts by voice) support-worker notes.
  - Checks each against the participant's goals and an audit checklist: objective language, goal linkage, the participant's response, and any risk indicators.
  - Produces a monthly "audit evidence" summary per participant.
- **Why it can win:**
  - Practice Standards audits are a recurring, feared event.
  - The **2026 mandatory SIL registration** has created a cohort of first-time audits.
  - Brevity, SupportAbility and CareMaster customers have no AI.
  - It sits next to the incumbent instead of replacing it.
- **Risk:** ShiftCare's Note Coach does a version of this for its own users. Integration or import friction.

### Wedge C (optional / secondary): incident narrative drafter with reportable-incident triage prompts
- **What:**
  - The worker dictates what happened.
  - Kith drafts a structured incident record.
  - It flags *possible* reportable-incident categories and restrictive-practice use, and shows the 24h / 5-day clocks.
  - A supervisor decides and submits via the NDIS Commission Portal.
- **Why:** this is the highest-stakes pain, and workers describe incidents conversationally without the formal terms [S].
- **Caution:** liability. It must be strictly assistive, with no auto-submission and clear disclaimers. Better as an add-on to Wedge B than as the pilot itself.

**Recommendation for the call:**
- Lead with **Wedge A** if C51's target org is an allied-health / therapy provider.
- Lead with **Wedge B** if it is a disability support / SIL provider.
- Either way, frame Kith as a **documentation engine that plugs into the incumbent system**, not as yet another platform.

---

## 6. Questions to ask Steve on the call
1. Which org(s) does C51 have in mind: allied health practice, disability support or SIL, or aged care? Size, and which software they run (ShiftCare, Brevity, Splose, Lumary...)?
2. Who would be the contracting party? Does C51 / AGI360 have an AU entity, ISO 27001 or SOC 2, or a security function we can lean on?
3. Has the target org already trialled Heidi, ShiftCare AI or Splose AI? What did they dislike?
4. Is the buyer willing to pay for a pilot? What is their procurement or security-review process?
5. Commercial model with C51: referral fee, reseller margin, or equity / services?
6. Is the C51 network open to AU-only hosting, including LLM inference on Bedrock (au)?

## 7. Kith pre-pilot technical checklist [U - derived]
- [ ] Migrate or provision a Supabase project in **ap-southeast-2**; pin Vercel functions to **syd1**.
- [ ] Move LLM inference to an AU-region endpoint (e.g. Bedrock "au" profile) and use AU-hosted speech-to-text; no US fallbacks for AU tenants.
- [ ] Sub-processor list plus data-flow diagram; DPA template; privacy policy updated for APP 8 and automated decisions.
- [ ] Per-session recording consent capture with an audit trail; typed-notes mode for states or clients that refuse recording.
- [ ] "Draft until signed" enforced; no diagnosis or treatment suggestions (TGA boundary); an intended-purpose statement.
- [ ] Breach response plan aligned to the NDB scheme; retention configurable (7 years by default).
- [ ] External vulnerability scan / pen test; Essential Eight self-assessment; security questionnaire pack.
- [ ] Restrict offshore staff access to AU data (encryption, key separation, logging).

---

## Sources (consolidated)
- NDIS Practice Standards PDF: https://ndiscommission.gov.au/sites/default/files/2024-10/ndis-practice-standards-and-quality-indicators.pdf
- NDIS Commission, reportable incidents: https://www.ndiscommission.gov.au/rules-and-standards/reportable-incidents-and-incident-management/reportable-incidents
- NDIS Commission, incident management guidance: https://ndiscommission.gov.au/sites/default/files/2024-09/detailed-guidance-incident-management-systems-detailed-guidance-regi-20240926.pdf
- NDIS Commission, restrictive practices (implementing providers): https://www.ndiscommission.gov.au/rules-and-standards/behaviour-support-and-restrictive-practices/rules-implementing-providers
- NDIS reform 2026: https://www.ndiscommission.gov.au/sites/default/files/2026-06/Amendment-Explanatory-Document-PDF.pdf ; https://www.minterellison.com/articles/ndis-legislative-reforms-mandatory-registration-and-new-access-rules
- NDIA plan reassessment reports: https://www.ndis.gov.au/providers/working-provider/allied-health-providers/plan-reassessment-reports
- NDIS pricing 2026-27 (secondary): https://ndsp.com.au/blog/ndis-news/ndis-pricing-schedule-2026-27-key-changes-explained/ ; https://daar.com.au/resources/ndis/ndis-pricing-guide/15_054_0128_1_3
- Audit documentation expectations (secondary): https://romeohr.com/blog/ndis-documentation-your-year-round-audit-compliance-guide
- Aged care: https://www.health.gov.au/resources/publications/strengthened-aged-care-quality-standards
- ShiftCare pricing / AI: https://www.shiftcare.com/au/pricing ; https://help.shiftcare.com/en/articles/11069117-ai-progress-notes ; https://shiftcare.com/blog/ai-as-intelligence-layer-feature-bolt-on-what-care-interactions-tell-us
- CareMaster pricing: https://caremaster.com.au/pricing
- Brevity: https://www.brevity.com.au/blog/category/price-list/
- Lumary: https://www.smartcompany.com.au/startupsmart/lumary-17-million-international-growth/
- SupportAbility: https://supportability.com.au/
- Splose AI: https://splose.com/resources/the-handover/what-is-ai-clinical-documentation-and-how-is-it-transforming-allied-health
- Perci / Cliniko: https://www.cliniko.com/connected-apps/perci
- CordoCare: https://sourceforge.net/software/product/CordoCare/
- Heidi pricing: https://www.heidihealth.com/pricing
- Lyrebird pricing: https://www.lyrebirdhealth.com/au/blogs/ai-medical-scribe-cost
- NSW Health AI scribes: https://medicalrepublic.com.au/nsw-health-commits-38-7m-to-ai-scribes-for-up-to-6000-clinicians/126906
- Metro South trial: https://www.mobihealthnews.com/news/anz/queensland-health-services-ai-scribe-saves-doctors-59-minutes-daily
- Ahpra AI guidance: https://www.ahpra.gov.au/Resources/Artificial-Intelligence-in-healthcare.aspx
- Avant, AI scribe consent: https://avant.org.au/resources/ai-scribes-and-patient-consent
- TGA and scribes: https://www.medicalrepublic.com.au/tga-flags-compliance-action-on-ai-scribes-as-review-finds-safety-concerns/127888 ; https://www.minterellison.com/articles/tga-publishes-findings-on-ai-and-medical-devices
- OAIC AI guidance: https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products
- OAIC overseas disclosure: https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/sending-personal-information-overseas
- OAIC NDB 2025 stats: https://www.oaic.gov.au/news/media-centre/data-breach-notifications-increase-to-all-time-high-in-2025,-new-ndb-stats-show
- Privacy reform tranche 1: https://www.hsfkramer.com/insights/2024-09/australian-privacy-reform-bill-tranche-1
- NSW health privacy quick guide: https://www.hpca.nsw.gov.au/resources/quick-guide-privacy
- Recording laws: https://hamiltonlocke.com.au/recording-private-conversations-the-law-in-australia/
- Supabase regions / residency: https://supabase.com/docs/guides/platform/regions ; https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq
- Vercel regions: https://vercel.com/docs/regions
- Bedrock AU cross-region inference: https://aws.amazon.com/blogs/machine-learning/introducing-amazon-bedrock-cross-region-inference-for-claude-sonnet-4-5-and-haiku-4-5-in-japan-and-australia/
- Essential Eight procurement context (secondary): https://www.konfirmity.com/framework/essential-eight
