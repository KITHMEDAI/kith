---
title: "GDPR and AI Notetaking: What UK Therapists Need to Know"
description: "How UK GDPR actually applies to AI-assisted session notes — special category data, who's the controller, and the cross-border question AI tools raise."
date: "2026-08-16"
keyword: "gdpr compliant therapy software"
draft: true
---

*This is a general explainer, not legal advice. Data protection guidance — particularly around AI — continues to evolve, including specific guidance from the ICO. If compliance decisions carry real weight for your practice, have them reviewed by someone qualified to advise on UK data protection law.*

Brexit didn't remove GDPR from UK practice — it became "UK GDPR", sitting alongside the Data Protection Act 2018, and it still governs how you handle patient data today. Most write-ups of this are aimed at e-commerce and marketing teams. Here's what actually matters if you're a therapist thinking about adopting an AI notetaking tool. (For the equivalent picture in India, see our [DPDP 2023 explainer](/blog/dpdp-2023-therapist-notes) — the two laws share a lot of structure, with one notable difference covered below.)

## Who's actually responsible: you, not your software

UK GDPR defines a **data controller** (decides why and how data is processed) and a **data processor** (processes on the controller's instructions). For your patients' clinical information, **you are the controller.** Your notetaking software — AI-assisted or not — is a processor, acting on your instructions. The Information Commissioner's Office (ICO) holds the controller primarily accountable, which means the compliance obligation is yours first, regardless of which tool you use.

That has a practical consequence: you need a data processing agreement with any vendor that touches patient data, and you need to actually understand what they do with it — not just trust a privacy policy page exists.

## The part that's different from India's law: special category data

If you've looked at how other jurisdictions handle this — India's DPDP Act 2023, for instance — you'll notice UK GDPR does something DPDP doesn't: it puts **health data in its own stricter tier.** Under Article 9, health data (which therapy notes obviously are) counts as "special category data," and processing it requires clearing an *extra* bar on top of the normal Article 6 lawful basis.

In practice, for a therapy practice, that usually means one of two paths:

- **Explicit consent** from the patient — a clear, specific, affirmative agreement to have their data processed this way, separate from just agreeing to therapy itself.
- **The health/social care provision** condition (Article 9(2)(h), combined with Schedule 1 of the Data Protection Act 2018) — available specifically because you're a health professional providing care, subject to confidentiality obligations.

Either path works; what doesn't work is treating this as automatically covered because you have a general basis (like "legitimate interests") for processing personal data generally. Special category data needs its own, separate justification.

## What patients can ask you for

UK GDPR gives patients real, enforceable rights over their own data:

- **Subject access requests (SARs)** — a patient can ask what data you hold about them, and you generally have one month to respond.
- **Rectification** — correcting inaccurate data.
- **Erasure** — the "right to be forgotten," though this isn't absolute for clinical records; professional retention requirements (and your own legitimate need to keep an accurate treatment history) can override it in specific circumstances. Erasure requests still need a real process, not a blanket refusal.

If a SAR arrived tomorrow, could you actually produce everything you hold on that patient within a month? That's the practical test, more than any policy document.

## The 72-hour rule

If patient data is breached, UK GDPR requires notifying the ICO within 72 hours of becoming aware, where the breach is likely to pose a risk to the people affected — and notifying the individuals themselves if the risk is high. 72 hours is not a long window. It only works if you'd actually know a breach happened, which depends on whether your tools log and monitor access in the first place — not something you can retrofit after the fact.

## The AI-specific wrinkle: where does the data actually go?

This is the part that's easy to miss and specific to AI tools. Many AI notetaking and transcription services run on infrastructure — or call AI models — hosted outside the UK, often in the US. UK GDPR restricts transferring personal data outside the UK unless there's an adequate legal mechanism in place: an adequacy decision, Standard Contractual Clauses, the UK's International Data Transfer Addendum, or equivalent.

Before adopting an AI notetaking tool, it's worth asking directly: **where does the audio and transcript actually get processed, and what transfer mechanism covers that if it's outside the UK?** A vendor that can't answer this clearly, or whose answer is "we use a US-based AI provider" with no mention of a transfer safeguard, is a real gap — not a technicality.

The ICO has also published specific guidance on AI and data protection, which continues to develop; if you're evaluating a tool that leans heavily on its "AI" capabilities, it's worth checking the ICO's current position rather than assuming general GDPR compliance covers AI-specific risks automatically.

## What to actually check

- Is there a **data processing agreement** in place with your notetaking vendor?
- Does your consent process **separately and explicitly** cover AI processing, not just recording?
- Do you have a **real process** for a subject access request, not just a stated policy?
- Would you **actually know** if a breach happened, in time to meet the 72-hour window?
- If the tool uses AI processing hosted outside the UK, **what transfer safeguard applies**, specifically?

None of this is about finding the tool with the best compliance marketing copy. It's about being able to answer these questions honestly, for your own practice, regardless of which tool sits underneath it.
