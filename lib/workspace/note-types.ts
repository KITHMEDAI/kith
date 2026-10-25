/**
 * lib/workspace/note-types.ts
 *
 * Note types offered on the New note screen. Every type renders through the
 * same generic note shape (sections + action items + flags), so adding one is
 * a single entry here: `sections` tells the model which headings to use and
 * `guidance` how to write them. `fixed` blocks are always present in the
 * final note (generate.ts enforceFixedBlocks), filled in or marked as not
 * stated, for record types an auditor checks line by line.
 */
import type { FieldKey } from './fields';

export interface NoteTypeDef {
  key: string;
  label: string;
  hint: string;                 // one line under the label in the picker
  fields: FieldKey[] | 'all';   // which fields see this type
  sections: string[];           // headings the note should use (model may omit empty ones)
  guidance: string;
  fixed?: FixedBlock[];
  factualFlags?: boolean;       // cut advice the input didn't give from flags / follow-ups / missing info (generate.ts stripAdvice)
}

export interface FixedBlock {
  heading: string;              // must also be in `sections`
  labels?: string[];            // one "Label: value" line each, in this order
  empty: string;                // value (or the only point) when the input doesn't give it
  confirmNone?: boolean;        // "None" only when the input says so, otherwise `empty`
  dateLabel?: string;           // this label is the record's date: spoken words + "(note written …)" (generate.ts dateLine)
  orActions?: string;           // point used instead of `empty` when the note has action items
  workerLabel?: string;         // this label names the worker: "Me" is not a name
}

export const NOTE_TYPES: NoteTypeDef[] = [
  // ── Available to everyone ─────────────────────────────────────────────
  {
    key: 'general', label: 'General notes', hint: 'Clean summary of anything', fields: 'all',
    sections: ['Overview', 'Key points', 'Details'],
    guidance: 'Organise whatever was said or typed into a clear, skimmable note. Choose sensible section content; keep the speaker\'s meaning.',
  },
  {
    key: 'meeting_minutes', label: 'Meeting minutes', hint: 'Attendees, decisions, actions', fields: 'all',
    sections: ['Attendees', 'Agenda items discussed', 'Risks & issues'],
    guidance: 'Formal minutes. One point per agenda item recording what was discussed and who raised it (role or name only if clear). Resolutions/decisions go ONLY in decisions and actions ONLY in action_items; the agenda item points must not restate them. Record movers/seconders only if named.',
  },
  {
    key: 'client_call', label: 'Client / stakeholder call', hint: 'Needs, commitments, next steps', fields: 'all',
    sections: ['Who & context', 'What they need', 'What we discussed', 'Commitments made'],
    guidance: 'Capture the other party\'s needs and concerns in their terms, what was agreed, and every follow-up with a date.',
  },
  {
    key: 'interview', label: 'Interview', hint: 'Q&A, observations, assessment', fields: 'all',
    sections: ['Interviewee & context', 'Questions & answers', 'Strengths (as stated)', 'Concerns (as stated)', 'Recommendation / outcome (as stated)'],
    guidance: 'Summarise answers faithfully. Strengths, Concerns and Recommendation only from what the interviewer actually said; never infer them from answers; omit those headings if not stated. For witness, investigation or research interviews, omit Strengths/Concerns entirely and record no findings. Usually no flags unless a risk was raised.',
  },
  {
    key: 'daily_log', label: 'Daily log / handover', hint: 'What happened, what\'s next', fields: 'all',
    sections: ['Summary of the day/shift', 'Completed', 'Outstanding', 'Handover to next person'],
    guidance: 'Write for the next person picking up the work. "Outstanding" items need enough detail to act on; don\'t repeat the same item under both "Outstanding" and "Handover to next person". If the log describes a different day than the note date (e.g. "yesterday"), say which day.',
  },
  {
    key: 'incident_report', label: 'Incident report', hint: 'Facts, timeline, actions taken', fields: 'all',
    sections: ['What happened', 'When & where', 'People involved', 'Immediate actions taken', 'Witnesses', 'Follow-up required'],
    guidance: 'Strictly factual, chronological, no blame or speculation. Only record who witnessed what as stated (the author may not have seen it). Missing facts (time, location, names) go in missing_info. "Follow-up required" holds only follow-up the input mentions; put tasks with a doer in action_items instead. Flag whether it may be notifiable (e.g. to the WHS regulator) for a manager to decide when there is a serious injury or dangerous incident.',
  },
  {
    key: 'custom', label: 'Custom', hint: 'Describe the note you want', fields: 'all',
    sections: [],
    guidance: 'Follow the user\'s own description of the note they want.',
  },

  // ── Field-specific ───────────────────────────────────────────────────
  {
    key: 'medical_consult', label: 'Consult note (SOAP)', hint: 'Subjective, objective, assessment, plan', fields: ['healthcare', 'allied_health'],
    sections: ['Subjective', 'Objective', 'Assessment (as stated by clinician)', 'Plan'],
    guidance: 'Standard SOAP. Assessment and plan only as stated by the clinician; never add a diagnosis or treatment.',
  },
  {
    key: 'referral_letter', label: 'Referral letter', hint: 'Ready-to-send referral', fields: ['healthcare', 'allied_health'],
    sections: ['Reason for referral', 'Relevant history', 'Current medications & allergies', 'Request'],
    guidance: 'Concise, professional referral content. Mark anything not provided as missing rather than inventing it.',
  },
  {
    key: 'clinical_handover', label: 'Clinical handover (ISBAR)', hint: 'Identify, situation, background, assessment, request', fields: ['healthcare', 'aged_care'],
    sections: ['Identify', 'Situation', 'Background', 'Assessment', 'Recommendation / request'],
    guidance: 'ISBAR handover, as used in Australian clinical settings.',
  },
  {
    key: 'pharma_hcp_call', label: 'HCP call note', hint: 'Rep visit with a healthcare professional', fields: ['pharma'],
    sections: ['HCP & setting', 'Products / topics discussed', 'HCP questions & objections', 'Materials / samples provided', 'Agreed next steps'],
    guidance: 'Factual call record. No promotional claims. Any adverse event, side effect, product complaint or off-label question goes in flags for pharmacovigilance/medical review.',
  },
  {
    key: 'pharma_msl', label: 'MSL interaction', hint: 'Scientific exchange record', fields: ['pharma'],
    sections: ['HCP / KOL & context', 'Scientific topics discussed', 'Insights gathered', 'Unsolicited requests', 'Follow-up'],
    guidance: 'Medical-affairs record. Distinguish unsolicited requests. Flag adverse events and off-label discussion.',
  },
  {
    key: 'pharma_adverse_event', label: 'Adverse event capture', hint: 'Capture details for PV reporting', fields: ['pharma', 'healthcare'],
    sections: ['Reporter', 'Patient (de-identified details as given)', 'Product(s)', 'Event description', 'Onset & outcome'],
    guidance: 'Capture the four minimum criteria (identifiable reporter, identifiable patient, suspect product, event); any that are absent go first in missing_info (there is no "Missing information" section). Record dose, dates and outcome exactly as given, keeping uncertainty ("caller thinks 5 mg"). Never assess or imply causality, not in the title either (say "reported while taking X", never "X-associated"). Always add one flag that this must go to pharmacovigilance within the company timeframe (urgent if hospitalisation, death or other serious outcome is mentioned).',
  },
  {
    key: 'construction_site_inspection', label: 'Site inspection / walkthrough', hint: 'Progress, defects, hazards', fields: ['construction', 'property'],
    sections: ['Site & areas inspected', 'Progress observed', 'Defects / issues', 'Safety observations', 'Instructions given'],
    guidance: 'Location-specific: every defect/hazard tied to an area or level. Each hazard appears once in "Safety observations" AND as a flag with location and responsible person (the flag is the only allowed double-up). Instructions given on the spot go under "Instructions given"; only tasks with a stated doer/deadline go in action_items instead.',
  },
  {
    key: 'construction_toolbox', label: 'Toolbox talk (safety)', hint: 'Topic, attendees, hazards', fields: ['construction', 'agriculture'],
    sections: ['Topic', 'Attendees', 'Hazards & controls discussed', 'Worker questions / concerns'],
    guidance: 'WHS toolbox talk record suitable for site safety files.',
  },
  {
    key: 'construction_site_diary', label: 'Daily site diary', hint: 'Weather, labour, works, delays', fields: ['construction'],
    sections: ['Weather & conditions', 'Labour & trades on site', 'Works completed', 'Deliveries & plant', 'Delays & variations', 'Visitors'],
    guidance: 'Contemporaneous site diary entry; delays and variations need cause and impact if stated.',
  },
  {
    key: 'construction_defects', label: 'Defects / punch list', hint: 'Itemised defects with owners', fields: ['construction', 'property'],
    sections: ['Defects by location'],
    guidance: 'One line per defect under "Defects by location": "Location: defect: responsible trade (only if stated)". The defect list IS the to-do list: do not repeat defects as action_items. action_items only for other tasks (e.g. "send rectification schedule"). Safety-relevant defects (smoke alarms, electrical, falls, water ingress) also get a flag.',
  },
  {
    key: 'ndis_progress_note', label: 'Shift / progress note', hint: 'Shift details, supports, goals, incidents', fields: ['ndis'],
    sections: ['Shift details', 'Supports provided', 'Participant\'s response & wellbeing', 'Goal link', 'Incidents', 'Concerns / changes noticed', 'Handover'],
    guidance: `NDIS shift / progress note, written so a team leader or NDIS auditor can rely on it (billing evidence). Objective and person-centred.
- "Shift details" (always first, every line present, one "Label: value" per line in this order): "Date:", "Shift time:", "Participant:", "Support worker:", "Location:", "Support type:". Use only what the input states; otherwise write "Not stated". Date: only the words the worker used for the day ("Tuesday", "this arvo"), or "Not stated"; never a weekday or calendar date the worker didn't say. The app then completes the line from the note date: "Tuesday (note written 21 October 2026)", "21 October 2026 (worker said 'this arvo')", or "Not stated (note written 21 October 2026): confirm". Support worker: the worker named in the input as doing the shift; in typed notes written by the worker (first person, or no other worker mentioned) it is the note author, written "<author name> (note author)"; otherwise "Not stated". Location: where the support happened (e.g. "home", "community: Parramatta pool"). Support type: the kind of support, in the input's words only (no category labels the worker didn't use, e.g. not "leisure support" for watching TV) (e.g. "personal care, breakfast preparation", "community access").
- Who is who: the participant is the person supported. In a recorded handover the speakers are usually workers or a team leader, and the participant is talked about, not speaking. Say who gave and who received the handover only by the names and roles the input uses.
- Dates everywhere in this note stay exactly as spoken ("Monday at 10", "next Thursday"): never add a calendar date.
- Summary: 2 sentences of plain facts from the body. No evaluations ("participated well", "reported feeling well", "showed improvement" unless the worker said it), no paraphrased quotes, no "minimal support", no "independently" unless the worker said it or next to a prompt, no "mild"/"good spirits".
- Each observation appears once: worker actions under "Supports provided", the participant's behaviour and words under "Participant's response & wellbeing". "Concerns / changes noticed" only for a change or concern the worker named; omit it when there is nothing for it.
- "Supports provided": only actions the worker said they did (never add "provided verbal support" or "encouraged" unless said), specific and in order, with the level of support or prompting when stated ("1 verbal prompt", "independently"). Medication only as given: name, dose, time, where recorded, and who gave it only as stated ("took his meds" = "took", not "administered").
- "Participant's response & wellbeing": observable behaviour, mood the worker reported, and the participant's own words in quotation marks, only when the input gives them as exact words (first person, e.g. said "I'm feeling heaps better"); reported speech ("she said Dad grabbed her") stays reported speech, without quotation marks. Words the worker used to describe the participant are the worker's ("Jess reported he was pleased ('pretty chuffed')"), not the participant's. Never add "independently" or a level of support the worker didn't state. Don't add how the shift ended or a mood the worker didn't report. Rewrite judgemental labels (e.g. "lazy", "difficult", "pigsty") as the observable facts the input gives, without adding reasons; never quote the labels. Keep ratings as given ("pain 4/10"); never soften or strengthen them ("mild", "severe").
- "Goal link": ONLY a plan goal the worker names (e.g. "his hydrotherapy goal", "her goal of catching the bus to TAFE on her own"): "Goal (as stated): <goal>", then ONE short point on what was done towards it and progress as stated (don't repeat the supports list). A goal the worker marks as uncertain ("goal: independent shopping?") is "Possible goal (worker unsure): <goal>" with no progress claim. If no goal is named, the only point is "Not stated" — never infer or name a goal from an activity (paying for lunch is not a "financial independence" goal; making toast is not "demonstrating independence").
- "Incidents": the incident, if the worker described one (injury, restrictive practice, behaviour of concern causing harm, medication error, property damage), else "None" ONLY if the worker said so ("no incidents"). If the worker didn't say, write "None reported by the worker: confirm before signing". Pain, frustration that settled, or a missed task is not an incident.
- "Handover": always present; what the worker asked the next shift to do or know, in their words ("next shift: grocery shop Thursday", not "scheduled"); tasks with a doer or date go in action_items instead (rule 8).
- follow_ups: only questions the worker raised. Never add "confirm whether…", "check with the team leader…" or "consider…": something the participant said they want (e.g. to try the deep end) is recorded under their response, not turned into a task.
- Flags ONLY for: a possible incident, restrictive practice, injury, medication error or missed dose, or a safeguarding concern (e.g. a disclosure of harm). A dose refused and then taken, or taken late with no harm, is recorded in the body, not flagged. They state the fact; they never add a task or check the worker didn't mention ("confirm medication register", "supervisor to check whether BP monitoring is required", "review note quality"). Never "supervisor to be aware / may wish to / to consider". Routine or PRN medication given and recorded as stated, pain that was treated, a check not done because of broken equipment, or an item running low is not a flag (record it in the body). Most shift notes need 0 flags.
- missing_info: only gaps in the note's own required details (e.g. support worker name, shift date), never speculation about plans, protocols, routines or patterns ("unclear whether BP monitoring is required" is not a gap).`,
    fixed: [
      { heading: 'Shift details', labels: ['Date', 'Shift time', 'Participant', 'Support worker', 'Location', 'Support type'], empty: 'Not stated', dateLabel: 'Date', workerLabel: 'Support worker' },
      { heading: 'Goal link', empty: 'Not stated' },
      { heading: 'Incidents', empty: 'None reported by the worker: confirm before signing', confirmNone: true },
      { heading: 'Handover', empty: 'Not stated', orActions: 'See action items' },
    ],
    factualFlags: true,
  },
  {
    key: 'ndis_incident', label: 'Incident report (NDIS / aged care SIRS)', hint: 'Possible reportable incident', fields: ['ndis', 'aged_care'],
    sections: ['Incident details', 'What happened', 'Injury / harm', 'Immediate actions & first aid', 'People involved & witnesses', 'Who was notified', 'Contributing factors (as stated)', 'Prevention / follow-up (as stated)'],
    guidance: `Incident record a provider's incident manager can use as the internal record and as the basis for any Commission notification. Factual and chronological; no blame (name people by name or role, never "perpetrator", "victim" or "offender"), no speculation about causes or motives beyond what was said; record admissions as said ("Tom said the mat not being returned was 'on us'").
- "Incident details" (always first, every line present, "Label: value"): "Date:", "Time:", "Location:", "Participant / resident:", "Reported by:". Only what the input states, otherwise "Not stated". Date: only the words used ("this morning", "Tuesday") or "Not stated"; the app then completes the line from the note date: "Tuesday (note written 21 October 2026)", "21 October 2026 (worker said 'this morning')", or "Not stated (note written 21 October 2026): confirm". Keep other dates as spoken, never add a calendar date.
- "Injury / harm": exactly as described (size, site, pain rating, "no head strike"), or "No injury or harm observed" when stated. "People involved & witnesses": each person with their role as stated, and what each witness saw or did (someone who arrived after did not see it happen: say so). "Who was notified": who, when and what they advised. "Contributing factors (as stated)": only causes the reporter gave (e.g. "staff member was responding to another resident's fall"), else "Not stated". "Prevention / follow-up (as stated)": only steps the reporter said were taken or planned, else "Not stated". Say "witnesses: not stated" when the input names none.
- Missing facts (exact time, authorisation, who has not been told, staff full names) go in missing_info (there is no "Missing information" section). Don't speculate about consent, guardianship or plans.
- Always add exactly ONE flag with the reportable-incident assessment, for a supervisor to decide. Apply the rules for the user's field:
  NDIS (NDIS Commission reportable incidents): reportable = death of a person with disability; serious injury (e.g. fracture, burns, deep cuts, extensive bruising, concussion, injury needing hospital treatment); abuse or neglect; unlawful sexual or physical contact with, or assault of, the person; sexual misconduct; use of a restrictive practice that is unauthorised or not in line with the person's behaviour support plan (physical, mechanical, chemical, environmental restraint or seclusion). Timeframe: notify within 24 hours of key personnel becoming aware, EXCEPT unauthorised restrictive practice where NO ONE (participant, worker or anyone else) was harmed or injured: within 5 business days. If anyone was hit, hurt or injured in the incident, the 24-hour clock applies. PRN medication given for behaviour without authorisation or not in line with the behaviour support plan is chemical restraint.
  Decide the level from the input: a reportable category clearly shown (e.g. restraint not in the behaviour support plan) → "urgent": "Likely reportable incident: <category>. NDIS Commission notification due within <24 hours / 5 business days, with the reason>; supervisor to confirm." A minor injury treated with first aid (graze, bruise, soreness) is NOT a serious injury: "attention": "Not a serious injury as described, so not reportable on that ground; supervisor to assess whether <the specific stated failure, e.g. the non-slip mat not being replaced> could amount to neglect" (only when the input describes a failure of care; otherwise say it appears to be an internal incident). No harm and no reportable category (e.g. a late or missed dose with no effect observed) → "info": "Internal incident only: no harm and not a reportable incident category; record in the incident register. Supervisor to confirm." Never invoke the 24-hour clock unless a reportable category is clearly shown.
  Aged care (Serious Incident Response Scheme, Aged Care Quality and Safety Commission): Priority 1 (physical injury or discomfort needing medical or psychological treatment, unexplained absence, or unreasonable use of force, unlawful sexual contact, or death) within 24 hours; Priority 2 (other reportable incidents) within 30 days. Never refer to the NDIS Commission for aged-care residents.`,
    fixed: [
      { heading: 'Incident details', labels: ['Date', 'Time', 'Location', 'Participant / resident', 'Reported by'], empty: 'Not stated', dateLabel: 'Date' },
      { heading: 'People involved & witnesses', empty: 'Witnesses: not stated' },
      { heading: 'Contributing factors (as stated)', empty: 'Not stated' },
      { heading: 'Prevention / follow-up (as stated)', empty: 'Not stated' },
    ],
  },
  {
    key: 'aged_care_note', label: 'Care note', hint: 'Care delivered and wellbeing', fields: ['aged_care'],
    sections: ['Care provided', 'Wellbeing & behaviour', 'Food, fluids & continence', 'Mobility & skin', 'Family / visitor contact'],
    guidance: 'Objective, person-centred. Falls, skin integrity, intake concerns and medication issues go in flags.',
  },
  {
    key: 'hospitality_shift_handover', label: 'Shift handover', hint: 'Trading, staff, stock, issues', fields: ['hospitality', 'retail'],
    sections: ['Trading summary', 'Staffing', 'Stock & suppliers', 'Equipment & maintenance', 'Customer feedback', 'For next shift'],
    guidance: 'Short, practical handover for the next manager.',
  },
  {
    key: 'hospitality_food_safety', label: 'Food-safety check', hint: 'Temps, cleaning, allergens', fields: ['hospitality'],
    sections: ['Temperature checks', 'Cleaning & sanitising', 'Allergen controls', 'Pest control', 'Corrective actions'],
    guidance: 'Food-safety program record. Any out-of-range temperature or gap needs a corrective action and a flag.',
  },
  {
    key: 'council_consultation', label: 'Community consultation', hint: 'Submissions, themes, responses', fields: ['council'],
    sections: ['Consultation details', 'Attendees / stakeholders', 'Key themes raised', 'Responses given', 'Matters for follow-up'],
    guidance: 'Neutral record of community views; attribute to stakeholder groups, not opinions of the writer.',
  },
  {
    key: 'agri_inspection', label: 'Farm inspection log', hint: 'Paddocks, stock, treatments', fields: ['agriculture'],
    sections: ['Location / paddock', 'Crop or livestock condition', 'Treatments & withholding periods', 'Equipment', 'Biosecurity observations'],
    guidance: 'Practical farm log; chemical rates and withholding periods exactly as stated.',
  },
];

export const NOTE_TYPE_MAP: Record<string, NoteTypeDef> = Object.fromEntries(NOTE_TYPES.map(t => [t.key, t]));

/** Types to show for a field: field-specific first, then the universal ones. */
export function noteTypesForField(field: string): NoteTypeDef[] {
  const specific = NOTE_TYPES.filter(t => t.fields !== 'all' && t.fields.includes(field as FieldKey));
  const universal = NOTE_TYPES.filter(t => t.fields === 'all');
  return [...specific, ...universal];
}
