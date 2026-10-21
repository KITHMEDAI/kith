/**
 * Hand-written analysis appended to the notes eval report (see report.ts).
 * Written after reading every baseline + experimental note and judge issue.
 */
export const ANALYSIS = String.raw`
## How to read this

- **Pass** means every judge criterion scored 4 or more AND no hard deterministic failure. Hard checks: response shape, headings that aren't in the note type's template, missing_info > 5, owners/due dates not found in the input, the same item appearing in a section AND in decisions/actions/follow-ups, and diagnosis/causality wording.
- The judge alone passes 53/70. Most deterministic failures are **double-ups** (the same task shown twice in the rendered note), and the judge often scores those 4 anyway. A partner will see them on every note, so they count as failures here.
- Coverage is essentially solved (4.96). The weak spots are **concision (3.94)** and **structure (4.13)**: notes are padded and repetitive, not inaccurate. True hallucinations are rare but serious (see #4).
- Judge caveat: the first judging pass marked down notes with *no* flags (interviews). The criterion was fixed ("an empty flags list is correct when nothing is risky") and all 70 notes were re-judged. The numbers above use the corrected judge. Owner checks accept trade synonyms (e.g. sparky = electrician), and they only soft-warn when the author is named as owner in typed notes.

## Top 10 recurring problems (baseline)

1. **The same item appears 2-4 times (37/70 notes fail a hard dedupe check).** Template headings that are about next steps collide with rule 8 ("never repeat them as a section"). The collisions are: Agreed next steps, Follow-up, Follow-up required, Handover to next person, For next shift, Outstanding, Plan, Instructions given, Commitments made, Corrective actions, Matters for follow-up. The model writes the task under the heading, then again in action_items, and often a third time in follow_ups.
   *Examples:* pharma-msl-oncology "Send ESMO poster PDF" appears in the Unsolicited requests section, the Follow-up section, action_items and follow_ups. In construction-defects-townhouse each of the 7 defects appears in the section, in action_items, in follow_ups ("assign owners") and in missing_info ("responsible trades not identified").
2. **Note-type guidance contradicts the base rules.** construction_defects says "Each also becomes an action item". pharma_adverse_event and ndis_incident have a "Missing information" *section* as well as the missing_info field, so every AE/incident note lists its gaps twice.
3. **Decisions misused.** Facts, things already done and reported items are logged as "decisions": "Lease at 140 Flinders St signed", "Sorghum sowing in Paddock 7 completed", "Son advised to monitor overnight". It also invents real decisions: aged-carenote-fall-bedrails has "Bed rails to remain up overnight as requested by daughter", which nobody decided, and general-interview-ops-coord has "WFH confirmed as one day per week" when the interviewer said "usually".
4. **Invented facts in a few places that matter:**
   - Wrong counts: "Twelve defect items" (actual 7); the experimental prompt still said "eight". "Twelve of fourteen students" (total never stated).
   - Wrong weekday arithmetic: "due Thursday 23 October" (Thursday is the 22nd).
   - A log written "yesterday" dated today (retail-dailylog-store, faithfulness 2).
   - "Caterpillar 793" (make not stated).
   - Invented clinical interpretation in SOAP: "quad lag indicates quadriceps weakness warranting targeted strengthening".
5. **Invented process actions and owners.** The model turns its own flags into tasks nobody stated, with owners assigned by convention:
   - "Notify supervisor of medication refusal… (Alex)"
   - "Complete formal fall incident report… (RN)"
   - "Notify team leader… (Incoming shift worker), due Immediately"
   - "Supervisor to assess… due 21 October 2026"
   - "Publish consultation summary (Council)"

   It also creates investigative steps in legal-interview-witness ("interview Fiona, Greg, Wei"). Due dates such as "Immediately" and "Urgent — as soon as possible" appear in 7 notes where the input never said so.
6. **The model is never told the weekday.** generateNote passes only "Date: 21 October 2026", so the model has to work out the weekday. This causes the 23-Oct "Thursday", turns ambiguous dates into exact ones ("last Tuesday" became "approximately 14 October"; "Mon" became "26 October"), and leads the model to put "Exact date of Friday" into missing_info.
7. **Wrong regulator for aged care.** The "NDIS incident report" type is offered to aged care, but its guidance only mentions the NDIS Commission. aged-incident-resident-push told the user to "notify the NDIS Commission within 24 hours" for a resident-on-resident push, which is a SIRS Priority 1 matter for the Aged Care Quality and Safety Commission (field_fit 2, flags 2). This is the most dangerous single error in the set.
8. **Over-flagging and missing_info padding.**
   - 66 urgent flags across 70 notes, e.g. "[urgent] Fire warden list must be updated". Admin items are flagged too: "heated" trader comment, price-change deadline, lost leads.
   - missing_info averages 4.3 items and is exactly 5 in 27/70 notes. It lists things that were simply not relevant ("Pest control observations — not mentioned during audit").
   - It implies treatments ("Whether supplemental oxygen was commenced").
9. **Interview template is forced onto non-candidate interviews.** The template's Strengths/Concerns headings get filled with inferred content: an invented WFH "concern"; a "Concerns" heading in a witness statement; editorial words like "hostile" and "significant". interview is 0/3 and meeting_minutes 0/5. Minutes also guess Speaker-to-name mappings ("Priya proposed 10 November" when Speaker D did).
10. **"Other"-field profiles are weak.** generateFieldProfile ignores "plain text only": it returns Markdown with headings and bold, and US spelling ("anesthesia").
   - It invents terms: "ICOP (Integrated Coal Operations Plan)", "underground gas monitoring" for an open-cut mine.
   - It suggests odd compliance items: Disability Discrimination Act for a wedding planner, while missing allergy/food safety.
   - It never names the real notification duty (QLD Mines Inspectorate / HPI). Even with the fixed prompt it hallucinated a regulator ("Queensland Resources and Energy Workers' Health and Safety Representative") and cited the metalliferous regulation for a coal mine.
   - Custom notes are always padded with the generic Decisions/Actions/Flags blocks. The tenant email kept an internal remark ("Landlord is reluctant to act") that a tenant should never see.

## Proposed fixes (ordered by impact)

All of these except E are applied in scripts/workspace-eval/notes/exp-generate.ts. On the 47 baseline failures they gave **0/47 → 22/47 passing**:
- notes with hard deterministic failures fell from 37 to 13
- concision rose from 3.83 to 4.19
- latency fell from 18.0s to 13.5s, because notes got shorter
- urgent flags fell to 23 across 47 notes, against 66 across 70 at baseline

The 23 baseline passes were not re-run (cost cap), so regressions there are unverified. Projected overall pass rate is about 45/70 (64%), before fix E.

### A. One home per fact (BASE_RULES rule 8): biggest impact

Before:
${'```'}
8. Decisions, action items, follow-ups and flags have their own fields. Never repeat them as a section, and don't restate the same point twice.
${'```'}
After:
${'```'}
8. Each fact appears ONCE in the whole note. The dedicated fields are the only home for their content:
   - decisions: choices explicitly agreed or approved in the input. Not facts, not things already done, not things merely reported or proposed.
   - action_items: future tasks (rule 7).
   - follow_ups: open questions or items to revisit that are not yet anyone's task.
   - flags: risks (rule 6).
   When a template heading is about next steps (e.g. "Plan", "Agreed next steps", "Follow-up", "Follow-up required", "Instructions given", "Commitments made", "For next shift", "Handover to next person", "Outstanding", "Corrective actions", "Matters for follow-up", "Request"), put a task EITHER under that heading OR in action_items, never both: if it has a doer or a deadline it goes in action_items only, and the heading keeps only context the reader needs. Omit a heading left empty.
${'```'}

### B. Stop inventing actions, owners and urgency (rule 6 → rule 7)

Before:
${'```'}
6. Every concrete next step goes in "action_items" with an owner and due date only if stated (otherwise null).
${'```'}
After:
${'```'}
7. action_items = only next steps the input states or someone commits to. Do NOT create process tasks the input doesn't mention (e.g. "complete incident form", "notify supervisor", "document in register") — if such a step seems needed, raise it as a flag instead. owner = a name or role exactly as stated in the input; use the note author only when the input says "I/we will" (typed notes: the author's own to-dos). Never assign an owner by convention ("RN", "Supervisor", "Incoming shift"). due = only a stated date/time — never "Immediately"/"ASAP" unless those words were used. Otherwise null.
${'```'}
Effect: "owner not grounded" fell from 11 to 1 and "due not grounded" from 10 to 0.

### C. Give the model a calendar (generate.ts user message)

Before:
${'```'}
const user = ${'`'}Date: ${'${input.date}'}...${'`'}
${'```'}
After (see dateBlock() in exp-generate.ts):
${'```'}
Date of note: Wednesday 21 October 2026.
Calendar (use for relative dates): Wednesday 14 October, ..., Wednesday 4 November.
Date rules: resolve a relative date only when it is unambiguous ("tmrw", "Fri", "this Thu" = the next such day; "yesterday"); for "next <weekday>" use the one in the following week. Keep ambiguous ones as written ("last Tuesday", a bare "Mon" that could be past or future, "next week"). Never compute a date by adding durations unless the input gives the start date and duration exactly.
${'```'}
Plus daily_log guidance: "If the log describes a different day than the note date (e.g. 'yesterday'), say which day." An automated weekday/date consistency scan found 0 mismatches in the experimental notes, against 3 in baseline. One baseline input ("movers booked for Sat 1 Nov?") was itself wrong, since 1 Nov 2026 is a Sunday. The note repeated it without comment. With a calendar in the prompt, a cheap extra rule would catch this: "if the input pairs a weekday with a date that doesn't match, keep both and add a follow-up to confirm".

### D. Field-correct incident regimes (note-types.ts + fields.ts)

ndis_incident: rename it to "Incident report (NDIS / aged care SIRS)", drop the "Missing information" section, and change the guidance.

Before:
${'```'}
Always flag whether it may be a reportable incident (generally 24 h to the NDIS Commission) for a supervisor to decide.
${'```'}
After:
${'```'}
Always add one flag on whether it may be reportable, for a supervisor to decide: in NDIS settings, a reportable incident to the NDIS Commission (generally within 24 h); in aged care, a SIRS incident to the Aged Care Quality and Safety Commission (Priority 1 generally within 24 h). Use the regime that matches the user's field.
${'```'}
Add to the aged_care profile: "...restrictive practices (including bed rails and PRN for behaviour; consent/authorisation status) and any possible serious incident under the Serious Incident Response Scheme (SIRS)... Priority 1 incidents are generally due to the Aged Care Quality and Safety Commission within 24 hours. Never refer to the NDIS Commission for aged-care residents." aged-incident-resident-push went from FAIL (field_fit 2) to PASS.

### E. Code-level dedupe safety net in parseJson (not yet applied)

The prompt alone leaves 17 double-ups, mostly in daily-log "Handover to next person" and MSL "Follow-up". Add a post-processing pass:
- drop a section point whose token overlap with any action/decision/follow-up is 0.6 or more (Jaccard; the same metric is in run.ts)
- drop follow-ups that duplicate an action
- drop a "Missing information" section when missing_info is non-empty

This is deterministic, free, and makes duplication impossible regardless of the model.

### F. Template fixes (note-types.ts)

- **construction_defects** guidance. Before: "One line per defect: location, description, responsible trade (if stated). Each also becomes an action item." After: "One line per defect: 'Location — defect — responsible trade (only if stated)'. The defect list IS the to-do list: do not repeat defects as action_items. action_items only for other tasks. Safety-relevant defects also get a flag."
- **pharma_adverse_event**: remove the "Missing information" section ("absent minimum criteria go first in missing_info"). Add: "Never assess or imply causality — not in the title either (say 'reported while taking X', never 'X-associated')." Baseline titled one note "Apixaban-associated recurrent epistaxis".
- **interview**: change the sections to Interviewee & context | Questions & answers | Strengths (as stated) | Concerns (as stated) | Recommendation / outcome (as stated). Guidance: "Strengths, Concerns and Recommendation only from what the interviewer actually said — never infer them; for witness, investigation or research interviews omit Strengths/Concerns entirely and record no findings." interview went from 0/3 to 3/3.
- **meeting_minutes**: "Resolutions/decisions go ONLY in decisions and actions ONLY in action_items — the agenda item points must not restate them. Record movers/seconders only if named."
- **noteTypeBlock**: "Use ONLY these section headings… Do not add other headings."

### G. No interpretation; hedges stay visible (new BASE_RULES rule 3)

${'```'}
3. Don't add interpretation or characterisation the speaker didn't give: no "indicates", "likely cause", "consistent with", "significant", "hostile", "acute-on-chronic". Keep hedges visible: anything marked "?", "maybe", "I think", "usually", "not sure" stays uncertain in the note. Drop speculation the speaker retracted.
${'```'}
Also add (still needed, as the experimental run said "eight defects"): **"Never state a count ('7 defects', '12 of 14 students') unless the input states it; if you need one, count the items you listed."** Better still, have the UI derive counts, or drop counts from summaries entirely.

### H. Calibrate flags and missing_info (rules 3 and 9)

${'```'}
6. ... "urgent" = someone may be at risk now, or a regulatory/legal reporting clock may be running ... Most notes need 0-3 flags; an empty list is correct when nothing is risky. Don't flag routine admin.
10. "missing_info" lists 0-5 gaps a reader would actually need to act on for this note type, most important first. Fewer is better. Don't list things that simply weren't relevant to what happened.
${'```'}
Also clamp missing_info to 5 in parseJson.

### I. Custom notes respect their audience (noteTypeBlock)

Append: "If the description names an audience (e.g. a client, tenant or manager), write for that audience and leave out internal remarks they shouldn't see." Product follow-up: for custom notes, consider hiding the generic Decisions/Flags blocks, or rendering them separately from the shareable body.

### J. Field profile generator ("Other")

Before: "Write a compact guide (max 80 words)… Plain text only, no preamble."

After:
${'```'}
Write a compact guide (max 90 words) for an AI note-taker serving them in Australia: the vocabulary to preserve, what their notes must capture, and which safety, welfare or compliance items must be flagged for review. Only well-established terms; never invent acronyms; leave out anything that doesn't apply to this exact work. Australian English. Output ONE plain-text paragraph: no markdown, no headings, no bullet points, no preamble.
${'```'}
This fixed the Markdown and spelling problems, but the model still invents regulators. Recommendation: **do not let the profile name regulators at all** (replace with "notifiable incidents for the relevant Australian regulator — flag for the user to decide"). Alternatively, run the profile on Sonnet and show it to the user to confirm at onboarding.

### Remaining failures after the experimental prompt (25/47)

| Cause | Count |
|---|---|
| Residual double-ups (fix E) | ~13 |
| Speaker-to-name guessing in minutes (pharma, sales, marketing) | 3 |
| Invented counts / exact times ("Approximately 2:00 pm" for "2ish") | 3 |
| Location mix-up (hazard put in "kitchen" instead of the back deck) | 1 |
| Implied post-fall skin check | 1 |
| Flagging a neutral "heated" comment | 1 |

Next step: apply A-J plus E in lib/workspace/generate.ts, then re-run all 70 cases (npx tsx scripts/workspace-eval/notes/run.ts) to confirm there are no regressions on the 23 baseline passes.
`;
