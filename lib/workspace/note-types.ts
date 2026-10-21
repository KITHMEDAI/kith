/**
 * lib/workspace/note-types.ts
 *
 * Note types offered on the New note screen. Every type renders through the
 * same generic note shape (sections + action items + flags), so adding one is
 * a single entry here: `sections` tells the model which headings to use and
 * `guidance` how to write them.
 */
import type { FieldKey } from './fields';

export interface NoteTypeDef {
  key: string;
  label: string;
  hint: string;                 // one line under the label in the picker
  fields: FieldKey[] | 'all';   // which fields see this type
  sections: string[];           // headings the note should use (model may omit empty ones)
  guidance: string;
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
    key: 'ndis_progress_note', label: 'Shift / progress note', hint: 'Goal-linked, objective', fields: ['ndis'],
    sections: ['Supports provided', 'Participant\'s response & wellbeing', 'Progress towards goals', 'Concerns / changes noticed'],
    guidance: 'Objective, person-centred. Link to plan goals only when the input mentions them; otherwise list "goal link missing". Possible incidents or restrictive practices go in flags.',
  },
  {
    key: 'ndis_incident', label: 'Incident report (NDIS / aged care SIRS)', hint: 'Possible reportable incident', fields: ['ndis', 'aged_care'],
    sections: ['What happened', 'When & where', 'People involved', 'Immediate actions & supports', 'Who was notified'],
    guidance: 'Factual and chronological; no blame. Missing facts (exact time, authorisation, who has not been told) go in missing_info (there is no "Missing information" section). Always add one flag on whether it may be reportable, for a supervisor to decide: in NDIS settings, a reportable incident to the NDIS Commission (generally within 24 h); in aged care, a SIRS incident to the Aged Care Quality and Safety Commission (Priority 1 generally within 24 h). Use the regime that matches the user\'s field.',
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
