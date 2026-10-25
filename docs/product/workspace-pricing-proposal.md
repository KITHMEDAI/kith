# Kith Workspace: pricing proposal (draft for the Steve call)

Draft, 2026-10-24. These numbers are a starting point to discuss with Steve, not final. All prices are in AUD and include GST. FX assumption: A$1 = US$0.65.

## 1. What a note actually costs us

Speech-to-text is the main cost. AI writing is small.

| Item | Rate (US$) | Source |
|---|---|---|
| Deepgram live (Nova-3) | 0.0048/min, +0.0020 diarization, +0.0013 keyterms | deepgram.com/pricing |
| Deepgram whole-file "polish" pass | 0.0043/min, +0.0013 keyterms (diarization included) | deepgram.com/pricing |
| Claude Sonnet (note writing) | ~15k tokens in, ~2.5k out per hour of speech, about US$0.08 | $3 / $15 per M tokens |
| Ask question / AI update | about US$0.05–0.08 each | same |
| Voyage search index | well under 1¢ per note | |

**Cost per hour of recording**

| Mode | US$/hr | A$/hr |
|---|---|---|
| Record (in person, one mic) | ~0.90 | **~1.40** |
| Online meeting (tab + mic = two audio tracks) | ~1.45 | **~2.25** |
| Typed / pasted note (no audio) | ~0.03 per note | ~0.05 per note |

Caveats:
- Deepgram may charge more with the training opt-out (`mip_opt_out`) switched on. Check the first invoice.
- Online meeting mode could be made about 15% cheaper by dropping live diarization. The polish pass already separates speakers properly.

## 2. How long a session can be today

| Limit | Value | Why |
|---|---|---|
| Transcript size | 150,000 characters, about **2.5 hours of speech** | API input cap |
| Audio file | 50 MB, about 3.5 h at the recorder's 32 kbps | storage bucket cap |
| Processing | must finish in 300 s | Vercel function limit; 2.5 h fits, 3 h+ is risky |
| Daily safety cap | 8 h re-transcribed per user per day | rate limiter |

So **2.5 hours is the safe maximum per session** right now. Longer would need splitting or a background job.

## 3. What Australians already pay

| Product | Price | Notes |
|---|---|---|
| Sparks Scribe (NDIS) | from A$15/mo incl. GST | progress notes + invoicing |
| NoteReady (NDIS) | ~A$19/mo | sole traders / small providers |
| ShiftCare (NDIS platform) | A$9/user/mo, min 5 users | AI rephrase + voice in Essentials |
| Otter.ai | US$16.99/mo (~A$26) Pro: 1,200 min, 90-min cap. US$30 (~A$46) Business: 4-h cap | generic meetings |
| Fireflies.ai | US$18/mo (~A$28) Pro, US$29 (~A$45) Business | generic meetings |
| Lyrebird (clinical) | A$160/mo annual, A$240 monthly | GP/psych scribe |
| Heidi Health (clinical) | ~US$90–150/user/mo | clinical scribe |

Takeaways:
- NDIS / small-business tools sit at **A$15–20/month**.
- Generic meeting notetakers are **A$26–46/month**.
- Clinical scribes charge A$150+, but that's a different market with medical-grade claims we don't make.

Kith's edge:
- data in Sydney
- note types tuned to the user's field (NDIS / SIRS, aged care, pharma, construction…)
- answers only from your own notes
- no meeting bot joining calls

## 4. Proposed model: 14-day free trial, then two paid tiers

No permanent free tier. Everyone starts on a **14-day trial with everything switched on (Pro)**, then picks a plan.

### The two plans

| | **Essentials** | **Pro** |
|---|---|---|
| Who it's for | NDIS / aged-care workers, sole traders, anyone writing shift, visit or site notes | managers, consultants, pharma reps, anyone in long meetings or online calls |
| Price | **A$19/mo**, or A$15/mo billed yearly (A$180) | **A$45/mo**, or A$36/mo billed yearly (A$432) |
| Type / paste notes | unlimited (fair use) | unlimited (fair use) |
| Record in person (phone / laptop mic) | ✓ | ✓ |
| Online meetings (Meet / Teams / Zoom tab) | none | ✓ |
| **Longest recording** | **60 min** (a shift summary, a home/nurse visit, a site walk) | **2 hours** at launch; 3 h once long sessions are written in sections (see real-data-findings.md) |
| Recording hours / month | **8 h** | **25 h** |
| Ask your notes | 200 questions/mo | unlimited (fair use) |
| AI "add details or ask for changes", edit, PDF, all fields & note types, data in Sydney | ✓ | ✓ |

**Margins** (net = price − GST − ~2.5% payment fee):
- **Essentials**: net ~A$16.80. Worst case 8 h × A$1.40 = A$11 → still positive. Typical 2–3 h → ~75% margin.
- **Pro**: net ~A$39.80. Typical 6–10 h → ~50–65% margin. If someone used all 25 h *as online meetings* (A$56), we'd lose ~A$16 on them. That's acceptable as a rare case; if Steve wants zero risk, set Pro to 18 h or count meeting hours at 1.5×.

**Why 45 min / 2.5 h:**
- 45 min covers almost every support-worker or visit note and keeps Essentials cheap.
- Long meetings are the main thing people upgrade for.
- 2.5 h is the safe limit of the current pipeline. Going to **4 h** is possible later by transcribing and summarising in chunks; that needs about 1 day of engineering and a background job. It could become a Pro selling point.
- The recorder should warn at "5 minutes left" and stop cleanly at the limit, keeping everything said so far.

### The 14-day trial

| Setting | Proposal | Why |
|---|---|---|
| Features | everything (Pro) | people need to try online meetings to want Pro |
| Card required? | **No** | easier sign-up; Steve's network will try it without friction. Abuse is covered by the rows below |
| Recording allowance | **5 hours total** during the trial; recordings up to 2.5 h | caps our worst case at ~A$13 per trial account (5 h × A$2.25 + typed/Ask). Without a cap, someone could record 8 h/day for 14 days ≈ A$250 |
| Anti-abuse | verified email (already built), CAPTCHA on (needs the Turnstile keys), max ~3 trials per IP per month | stops "new email = new trial" farming |
| Reminder emails | day 1 welcome, day 7 "how's it going", day 12 "2 days left", day 14 "trial ended" | the day-12 email does most of the converting |

**What happens when the trial ends without a plan:**
- The account becomes **read-only**: the user can open, search, copy, export (PDF / "download my data") and delete their notes, but can't create new notes, record or ask.
- Nothing is deleted. That's reassuring, and matches the privacy page.
- Expired accounts with no plan are deleted after **12 months** of inactivity, with a warning email 30 days before. This needs a line on the privacy page when built.

**Typical trial cost:** most trial users record 1–2 h → ~A$3–5 each. If 1 in 10 trials converts at a blended ~A$25/mo, each paying customer cost about A$30–50 in trials and pays that back in 2 months.

### NDIS / care providers (Steve's channel)

- **Team plan:** Pro features, **A$35/user/mo** (A$29 billed yearly), **minimum 5 users**, invoiced.
- A **30-day team trial** set up for providers Steve introduces.
- Later: an admin who can add or remove staff and see usage. Each person's notes stay private to them unless sharing is built.

### Earlier option (not recommended now)

A permanent free tier (typing only, 30 notes/mo) at ~A$3/user/mo. The trial is better: it shows off recording and meetings, costs less overall, and avoids a pool of free users to support.

## 5. Open questions for the Steve call

1. Price in AUD only, or also USD/INR? PayU settles in INR. Check that PayU international cards are enabled for AUD charges.
2. Is A$19 right for NDIS sole traders, who are used to A$15–19? Or should Essentials be A$15?
3. Should Pro include online meetings, or should meetings be its own add-on?
4. Team pricing and minimum seats for providers.
5. Trial recording allowance (5 h?) and whether to ever ask for a card up front.
6. GST: KITH is an Indian business. Registering for Australian GST is required once AU sales exceed A$75k/yr. Until then, "incl. GST" wording needs an accountant's check.

## 6. What it takes to enforce this (not built yet)

The app has no plans or quotas today. Every signed-in user gets everything.
- Before charging: a `plan` + `trial_ends_at` on the profile, read-only mode after the trial, per-plan session caps in the recorder (warning + clean stop) and the API, monthly usage counters (recording minutes, notes, Ask), checks in the API (the existing `ws_rate_hit` counters can do most of it), and a PayU checkout with webhooks to set the plan.
- Roughly 1–2 days of work once prices are agreed.
