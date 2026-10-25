# Real-life data for pricing and limits (2026-10-24)

Two inputs:
1. Research on how long real sessions run in Steve's markets.
2. A test of 6 real meetings (14–50 min) plus a stitched 2.7 h session through the production pipeline.

Full test report: `eval-reports/real-audio-2026-10-24-05-07.md`. Test script: `scripts/workspace-eval/real-audio/run.ts`.

## 1. How long are real sessions?

| Who | Real-world length | Source |
|---|---|---|
| NDIS support worker shift | **2 h minimum** (SCHADS minimum engagement); usually several hours. The note is written at the end, and providers budget about **10 min** for it | NDIS / SCHADS award guides, Astalty |
| What gets recorded for a shift note | a **2–5 min spoken summary**, not the whole shift (recording a full shift is a privacy problem) | NDIS shift-note guides (Sparks Scribe, ShiftCare) |
| Home-care visit (Support at Home) | minimum billable **15–30 min** (care / personal care), **60 min** (nurse, allied health) | My Aged Care price guidance |
| Pharma rep call with a doctor | **3–8 min**; lunch meetings ~13 min | US/UK industry studies (dated) |
| Office meeting | average **~47 min**; professionals spend **11–17 h/week** in meetings | Laxis 2026, Laurel 2025, Reclaim.ai |
| No Australian dataset exists for shift, visit or meeting length; the above are the best available signals | | |

**What this means for the plans:**
- **Essentials users** mostly dictate short summaries (2–10 min) or record visits (15–60 min). They'll use only **~1–3 h of recording a month** (e.g. 20 shifts × 5 min ≈ 1.7 h), so the 8 h allowance is generous and cheap for us. The per-recording limit should be **60 min**, not 45, to cover nurse and allied-health visits.
- **Pro users** sit in 45–70 h of meetings a month, so they'll record only the important ones. 25 h is a sensible allowance. Most meetings are under an hour, but workshops and board meetings run 2–3 h.

## 2. Test on real recordings (production pipeline)

| Recording | Length | Processing time (limit 300 s) | Transcript size (limit 150k chars) | Our cost | Cost / hour | Note quality (faithful / coverage / useful, out of 5) |
|---|---|---|---|---|---|---|
| IS1009a | 14 min | 29 s | 9.5k | A$0.34 | A$1.45 | 4 / 5 / 5 ✓ |
| ES2004a | 18 min | 43 s | 12.6k | A$0.43 | A$1.46 | 5 / 5 / 5 ✓ |
| IS1009b | 34 min | 64 s | 29k | A$0.82 | A$1.43 | 4 / 5 / 5 ✓ |
| EN2002a | 36 min | 63 s | 34k | A$0.85 | A$1.42 | 4 / 5 / 5 ✓ |
| TS3003c | 43 min | 66 s | 22k | A$0.99 | A$1.39 | 4 / 5 / 5 ✓ |
| EN2002c | 50 min | 76 s | 49k | A$1.16 | A$1.40 | 3 / 5 / 5 ✗ |
| **4 meetings stitched** | **162 min (2.7 h)** | **106 s** | **134k** | A$3.65 | A$1.35 | **2 / 4 / 4 ✗** |

**Findings:**

1. **The cost estimate holds: A$1.35–1.46 per hour** for in-person recording (live + polish + AI writing). Online meetings (two audio tracks) are estimated at ~A$2.25/h. The pricing margins in `workspace-pricing-proposal.md` stand.
2. **Speed is not a problem.** Even 2.7 h finishes in **under 2 minutes**, well inside the 300 s limit. Audio is small: 2.7 h = 35 MB (limit 50 MB).
3. **The real ceiling is text size.** 2.7 h of speech made **134k characters**, close to the 150k cap; fast talkers would hit it at ~2.5–3 h. Raising the cap to ~200k is safe for the AI model and costs only a little more.
4. **Quality drops on very long sessions.** For meetings up to 50 min, notes scored 4–5/5 on coverage and usefulness. The 2.7 h stitched file produced **one invented decision and one invented name** (faithfulness 2/5). That test is harsher than reality (4 unrelated meetings in one file), but the risk is real. **Fix before selling sessions over ~1.5–2 h:** write long sessions in sections (summarise each ~45 min part, then combine). This is about 1 day of work, and it is also what makes 3 h+ sessions possible.
5. **Dates.** In 3 of 7 notes the writer turned "Monday" / "Friday" into an exact date (e.g. "Monday 26 October"), working from the recording date. That's usually helpful in real use, but the judge counts it as invented when the speaker never said the date. Suggested fix: write "Monday (26 Oct)" so the spoken day is kept and the date is shown as derived.
6. **Speaker names:** some actions were pinned to a speaker when the transcript was ambiguous. Already known; the note writer flags unclear owners in most cases.

**Not covered yet:**
- **Australian accents** (the test meetings are UK/European English).
- **Noisy rooms** (the mirror had no far-field room-mic recordings).
- **Online-meeting mode** on real calls.

The best real data here would be a few consented recordings from Steve's people (a shift summary, a home visit, a team meeting).

## 3. Recommended changes to the pricing draft

| Item | Was | Now (test-backed) |
|---|---|---|
| Essentials longest recording | 45 min | **60 min** (covers nurse / allied-health visits; costs us ≤ A$1.40) |
| Pro longest recording | 2.5 h | **2 h at launch**, **3 h** once long sessions are written in sections |
| Essentials monthly hours | 8 h | keep 8 h (typical use 1–3 h) |
| Pro monthly hours | 25 h | keep 25 h |
| Prices | A$19 / A$45 | unchanged; cost per hour confirmed |

## 4. Engineering follow-ups found by this test

1. **Section-by-section writing for long sessions** (> ~60 min): fixes the long-session hallucination and allows 3 h+.
2. **Raise the input cap** from 150k to ~200k characters, together with item 1.
3. **Date wording:** keep the spoken weekday and show the derived date in brackets.

## 5. Australian accent × noisy room (2026-10-25)

Two tests, both run through the production Deepgram settings (polish pass, NDIS keyterms):

**a) Real Australian speakers.** 6 LibriVox volunteers (public domain) read a standard passage, with English (RP) and New Zealand readers as baselines. Report: `eval-reports/aus-real-voices-2026-10-25-11-39.md`.

| Level | Word error rate, Australian speakers |
|---|---|
| clean | 0–3.5% (5 of 6 speakers) |
| busy café chatter (15 dB) | 0–3.5% |
| loud chatter + traffic (5 dB) | 1–7% |

The errors are mostly one unusual word ("cloak" → "coat"/"coke"), not the accent. One speaker's clean score (24.8%) and the NZ loud score are scoring artefacts: the passage start wasn't found, so the measurement failed, not the transcription.

**b) Australian voices in NDIS / aged-care dialogues.** Synthetic voices (Microsoft's Australian Natasha and William) with real café chatter and traffic rumble mixed in. Report: `eval-reports/aus-noise-2026-10-25-11-37.md`.

| Level | Avg word error | Speaker separation |
|---|---|---|
| clean | 5.3% | 100% |
| busy | 4.7% | 95% |
| loud | 5.2% | 98% |

**Findings:**
- **Noise is not the problem.** Accuracy barely changes from a quiet room to a loud one.
- **Local names and brands are the problem.** Voltaren → "Voltran"; Coversyl, Weet-Bix, Woolies, Woolloongabba, Kowalski and Mehta were often misheard. **Fix:**
  1. Add an Australian / NDIS vocabulary list to the field keyterms: common medicine brands (Panadol, Voltaren, Coversyl, Endep, Epilim…), Centrelink, Opal, TAFE, Woolies/Coles, and suburb names.
  2. Let each user add their own words (clients', places' and colleagues' names) to keyterms. That's the biggest win for names.
- **Most note failures came from the note writer, not the audio.** For example, it mixed up the participant (Darren) with a speaker in a handover, and did so even with a perfect transcript.

## 6. Do notes match real NDIS formats? (2026-10-25)

7 realistic inputs (dictated handover, rough typed note, judgemental wording, community access with a goal, fall, late medication, unauthorised restraint). Each was judged as an NDIS provider's quality and compliance lead would, against NDIS guidance: Sparks Scribe and ShiftCare templates, NDIS Commission reportable-incident rules, audit guides. Report: `eval-reports/ndis-format-2026-10-25-11-43.md`.

**Result: 1/7 met the auditor standard** (the restraint incident, which was correctly flagged as likely reportable). Objectivity was strong (5/5 on most notes, judgemental labels rewritten as facts). The gaps are all fixable in the note templates and prompt:

1. **No fixed "shift details" block.** Date, shift times, participant, worker, location and support type should always appear at the top, each filled in or marked "Not stated". Today they're scattered, and missing ones are sometimes not flagged.
2. **No explicit incidents line.** NDIS guidance expects "Incidents: none" (when the worker says so) or the incident. When the worker didn't mention incidents, show "Not mentioned: confirm before signing", never an invented "none".
3. **Invented goal links.** "Financial independence" from paying for lunch, and "demonstrating independence" with no stated goal. Link a plan goal **only** when the worker names one; otherwise "Goal link: not stated".
4. **Advice that wasn't in the input.** Flags like "Supervisor to check whether BP monitoring is required…" or "confirm medication register" break the no-advice rule. Flags should state facts, not tasks the worker didn't mention.
5. **Reportable-incident calls.** The restraint was flagged correctly, but the late medication (no harm) was over-called. Add the NDIS Commission rules to the incident template: what is reportable, 24 h vs 5 business days, and "internal incident only" for no-harm events.
6. **Dates.** "Thursday (22 Oct)" is helpful, but a strict reviewer calls the derived date invented. Keep the spoken day and label the date as calculated, or leave dates as spoken in NDIS notes.
7. **Formatting glitch:** an action item rendered as "…as requested by his mum., due Monday (26 Oct)".
8. **Reliability bug:** in one run, generation failed with invalid JSON on a typed note containing quotes, and the retry failed too. The user would see "We couldn't write this note". Fix: use the model's structured (tool / JSON-schema) output so the JSON is always valid.

## 7. Fixes for sections 5 and 6 (2026-10-25, not yet deployed)

| Finding | Fix | Result |
|---|---|---|
| 6.1 No shift-details block | `ndis_progress_note` now always starts with **Shift details** (Date, Shift time, Participant, Support worker, Location, Support type), filled from the input or "Not stated". This is enforced in code (`enforceFixedBlocks`), so the model can't leave it out | NDIS-format eval: 1/7 → **5/7 and 7/7** (two runs; the judge varies by about ±2) |
| 6.2 No incidents line | **Incidents** is always present. It says "None (worker said 'no incidents')" only when the worker said so, otherwise "None reported by the worker: confirm before signing" | |
| 6.3 Invented goal links | **Goal link** shows only a goal the worker names. An unsure goal is written "Possible goal (worker unsure)", otherwise "Not stated" | |
| 6.4 Advice not in the input | Prompt rules, plus code that cuts advice clauses ("supervisor may wish…", "confirm whether…", "as required by policy") and speculative gaps ("whether BP monitoring is required…") from flags, follow-ups and missing info | |
| 6.5 Reportable-incident calls | The incident template now has the NDIS Commission categories, the 24 h vs 5-business-day rule (5 days only when no one was harmed), PRN given for behaviour = chemical restraint, "internal incident only" for no-harm events, and the SIRS P1/P2 rules for aged care. Also fixed blocks for Incident details, witnesses, contributing factors and prevention | Fall, late medication and restraint: 5/5 on the reportable call |
| 6.6 Dates | **Decision:** NDIS and aged-care notes keep dates exactly as spoken. A calculated date (even labelled "calculated") was still counted as invented. The record's Date line adds the note date itself: "Tuesday (note written 21 October 2026)", "21 October 2026 (worker said 'this arvo')", or "Not stated (note written …): confirm". Other fields keep "Monday (26 Oct)" | |
| 6.7 "…mum., due Monday" | Trailing punctuation is removed from action-item tasks | |
| 6.8 Invalid JSON | Note writing and revising now use **structured output** (`output_config.format` with a JSON schema), so the reply is always valid JSON. A forced *strict tool* was tried first, but it cut text off at a quotation mark ("JM said: ") in 2 of 3 runs, and a non-strict tool sometimes returned `sections` as a string. Quotes are now written with single quotation marks, and a note with a cut-off string is retried once | 0 generation failures in all runs; the participant's quote kept 4/4 |
| 5 Local names/brands | Field vocabulary for ndis and aged_care now includes ~33 AU medicine brands, Centrelink/Medicare/My Aged Care/Opal/myki/TAFE/Woolies/Coles/Aldi/Bunnings/Chemist Warehouse/servo/Weet-Bix… New per-user **Names & terms** on the profile page (up to 40, encrypted). It is merged first into the Deepgram keyterms for both the live and polish passes (cap 100) and given to the note writer as a spelling reference | aus-noise (transcription only): WER 5.1% → **4.7%** with the field list, **4.3%** with user terms. Hard words kept 70 → 71/102 with the field list, **79/102** with user terms. Most remaining misses are spelling variants (WeetBix, nonslip) |

General notes eval: **52/70** (baseline 50–51). The care-field subset (8 cases) went 7/8 → 5/8, mostly judge noise on templates that didn't change. `ndis-progress-shopping` now fails because the judge doesn't accept a late dose flagged as info. Security check 69/69, tsc clean.

**Deploy order:** run `supabase/workspace/005_custom_terms.sql` (adds `ws_profiles.custom_terms`) **before** deploying. Until it runs, saving the profile page fails and the data export leaves out the profile block.
